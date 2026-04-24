import crypto from "node:crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";

import { config } from "./config.js";
import { AiSkillService } from "./services/aiSkillService.js";
import { FraudDetectionService } from "./services/fraudDetectionService.js";
import { IpfsService } from "./services/ipfsService.js";
import { MatchmakerService } from "./services/matchmakerService.js";
import { WorldIdService } from "./services/worldIdService.js";
import { database } from "./db.js";
import type {
  ReclaimProofPayload,
  SbtMetadata,
  WorldIdVerificationPayload,
} from "./types.js";

export function createRoutes() {
  const router = Router();
  const ipfsService = new IpfsService();
  const aiSkillService = new AiSkillService();
  const fraudDetectionService = new FraudDetectionService();
  const matchmakerService = new MatchmakerService();
  const worldIdService = new WorldIdService();

  const aiRateLimiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: config.aiRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (request, response) => {
      response.status(429).json({
        error: "Too many AI requests. Please try again shortly.",
        requestId: request.requestId,
      });
    },
  });

  const metadataSchema = z.object({
    name: z.string().min(3).max(120),
    description: z.string().min(10).max(500),
    platform: z.string().min(2).max(32),
    externalId: z.string().min(3).max(255),
    proofHash: z.string().min(10).max(255),
    timestamp: z.string().datetime(),
    attributes: z
      .array(
        z.object({
          trait_type: z.string().min(1).max(64),
          value: z.union([z.string().max(256), z.number(), z.boolean()]),
        }),
      )
      .max(20),
  });

  const addressSchema = z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address");

  const reclaimProofSchema = z.object({
    signature: z.string().min(32).max(200),
    proofHash: z.string().min(10).max(255),
    user: z.object({
      address: addressSchema,
      name: z.string().min(1).max(120),
      title: z.string().min(1).max(120),
      dates: z.string().max(120).optional(),
    }),
    platform: z.string().min(2).max(32),
    externalId: z.string().min(3).max(255),
    attributes: z
      .array(
        z.object({
          trait_type: z.string().min(1).max(64),
          value: z.union([z.string().max(256), z.number(), z.boolean()]),
        }),
      )
      .max(20)
      .optional(),
  });

  const worldIdSchema = z.object({
    nullifierHash: z.string().min(10).max(255),
    proof: z.string().min(10),
    signal: z.string().min(1).max(255),
    merkleRoot: z.string().min(10).max(255).optional(),
  });

  const reviewSchema = z.object({
    reviewText: z.string().min(5).max(1200),
    address: addressSchema.optional(),
  });

  const matchSchema = z.object({
    jobDescription: z.string().min(10).max(3000),
  });

  const metadataHashSchema = z.string().regex(/^[a-zA-Z0-9]{20,120}$/);

  router.get("/health", (_request, response) => {
    response.json({
      ok: true,
      service: "soulport-backend",
      timestamp: new Date().toISOString(),
    });
  });

  router.post("/reclaim/proof", async (request, response, next) => {
    try {
      const parsedPayload = reclaimProofSchema.safeParse(request.body);
      if (!parsedPayload.success) {
        return response.status(400).json({
          error: "Invalid reclaim proof payload",
          details: parsedPayload.error.issues,
          requestId: request.requestId,
        });
      }

      const payload = parsedPayload.data as ReclaimProofPayload;

      if (!verifyWebhookSignature(payload, request.rawBody)) {
        return response.status(401).json({
          error: "Invalid proof signature",
          hint: "Ensure the payload signature matches the webhook secret HMAC",
          requestId: request.requestId,
        });
      }

      const metadata = metadataSchema.parse({
        name: `LinkedIn Experience: ${payload.user.title}`,
        description: "Verified work history from LinkedIn",
        platform: payload.platform,
        externalId: payload.externalId,
        proofHash: payload.proofHash,
        timestamp: new Date().toISOString(),
        attributes: payload.attributes ?? [
          { trait_type: "name", value: payload.user.name },
          { trait_type: "title", value: payload.user.title },
          { trait_type: "dates", value: payload.user.dates ?? "" },
        ],
      }) as SbtMetadata;

      const metadataHash = await ipfsService.uploadJsonMetadata(metadata);

      const now = new Date().toISOString();
      database
        .prepare(
          `INSERT INTO users (address, display_name, created_at, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(address) DO UPDATE SET display_name = excluded.display_name, updated_at = excluded.updated_at`,
        )
        .run(payload.user.address, payload.user.name, now, now);

      database
        .prepare(
          `INSERT INTO proofs (address, proof_type, payload_json, verified, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        )
        .run(payload.user.address, "reclaim", JSON.stringify(payload), 1, now);

      database
        .prepare(
          `INSERT INTO attestations (address, platform, external_id, metadata_hash, proof_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          payload.user.address,
          payload.platform,
          payload.externalId,
          metadataHash,
          payload.proofHash,
          now,
        );

      return response.json({ metadataHash, metadata });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/worldid/verify", async (request, response, next) => {
    try {
      const parsedPayload = worldIdSchema.safeParse(request.body);
      if (!parsedPayload.success) {
        return response.status(400).json({
          error: "Invalid World ID payload",
          details: parsedPayload.error.issues,
          requestId: request.requestId,
        });
      }

      const payload = parsedPayload.data as WorldIdVerificationPayload;

      const result = await worldIdService.verify(payload);
      if (result.success) {
        return response.status(200).json(result);
      }

      const reason = result.reason ?? "World ID verification failed";
      const status = reason.includes("not configured")
        ? 503
        : reason.includes("already used")
          ? 409
          : 400;

      return response.status(status).json({
        ...result,
        error: reason,
        requestId: request.requestId,
      });
    } catch (error) {
      return next(error);
    }
  });

  router.get(
    "/ai/verify-skills/:address",
    aiRateLimiter,
    async (request, response, next) => {
      try {
        const parsedAddress = addressSchema.safeParse(request.params.address);
        if (!parsedAddress.success) {
          return response.status(400).json({
            error: "Invalid wallet address",
            details: parsedAddress.error.issues,
            requestId: request.requestId,
          });
        }

        const address = parsedAddress.data;
        const skills = await aiSkillService.verifySkills(address);
        const now = new Date().toISOString();

        database
          .prepare(
            `INSERT INTO users (address, display_name, created_at, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(address) DO UPDATE SET updated_at = excluded.updated_at`,
          )
          .run(address, null, now, now);

        for (const skill of skills) {
          database
            .prepare(
              `INSERT INTO ai_scores (address, score_type, score, metadata_json, created_at)
           VALUES (?, ?, ?, ?, ?)`,
            )
            .run(
              address,
              skill.skill,
              skill.confidence,
              JSON.stringify(skill),
              now,
            );
        }

        return response.json({ address, skills });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post(
    "/ai/analyze-review",
    aiRateLimiter,
    (request, response, next) => {
      try {
        const parsedPayload = reviewSchema.safeParse(request.body);
        if (!parsedPayload.success) {
          return response.status(400).json({
            error: "Invalid review analysis payload",
            details: parsedPayload.error.issues,
            requestId: request.requestId,
          });
        }

        const payload = parsedPayload.data;

        const result = fraudDetectionService.analyzeReview(payload.reviewText);
        const now = new Date().toISOString();
        const scoreAddress =
          payload.address ?? "0x0000000000000000000000000000000000000000";

        database
          .prepare(
            `INSERT INTO users (address, display_name, created_at, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(address) DO UPDATE SET updated_at = excluded.updated_at`,
          )
          .run(scoreAddress, null, now, now);

        database
          .prepare(
            `INSERT INTO ai_scores (address, score_type, score, metadata_json, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          )
          .run(
            scoreAddress,
            "review_credibility",
            result.credibilityScore,
            JSON.stringify(result),
            now,
          );

        return response.json(result);
      } catch (error) {
        return next(error);
      }
    },
  );

  router.post("/ai/match", aiRateLimiter, async (request, response, next) => {
    try {
      const parsedPayload = matchSchema.safeParse(request.body);
      if (!parsedPayload.success) {
        return response.status(400).json({
          error: "Invalid matchmaker payload",
          details: parsedPayload.error.issues,
          requestId: request.requestId,
        });
      }

      const payload = parsedPayload.data;
      const jobDescription = payload.jobDescription;

      const matches = await matchmakerService.matchFreelancers(jobDescription);
      const jobHash = `job_${Buffer.from(jobDescription).toString("hex").slice(0, 32)}`;
      const now = new Date().toISOString();

      matches.forEach((match, index) => {
        database
          .prepare(
            `INSERT INTO matches (job_hash, freelancer_address, rank, score, metadata_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .run(
            jobHash,
            match.address,
            index + 1,
            match.score,
            JSON.stringify(match),
            now,
          );
      });

      return response.json({ jobHash, matches });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/metadata/:hash", async (request, response, next) => {
    try {
      const parsedHash = metadataHashSchema.safeParse(request.params.hash);
      if (!parsedHash.success) {
        return response.status(400).json({
          error: "Invalid metadata hash",
          details: parsedHash.error.issues,
          requestId: request.requestId,
        });
      }

      const metadataHash = parsedHash.data;
      const gatewayBase = config.pinataGatewayUrl.endsWith("/")
        ? config.pinataGatewayUrl
        : `${config.pinataGatewayUrl}/`;
      const gatewayUrl = `${gatewayBase}${metadataHash}`;
      const pinataResponse = await fetch(gatewayUrl, {
        signal: AbortSignal.timeout(config.externalApiTimeoutMs),
      });

      if (!pinataResponse.ok) {
        const status = pinataResponse.status >= 500 ? 502 : 404;
        return response.status(status).json({
          error:
            status === 502
              ? "Metadata gateway is currently unavailable"
              : "Metadata not found",
          requestId: request.requestId,
        });
      }

      const metadata = await pinataResponse.json();
      return response.json({ hash: metadataHash, metadata });
    } catch (error) {
      return next(error);
    }
  });

  router.use((_request, response) => {
    response.status(404).json({ error: "API route not found" });
  });

  return router;
}

function verifyWebhookSignature(
  payload: ReclaimProofPayload,
  rawBody?: string,
): boolean {
  if (!config.reclaimWebhookSecret) {
    return true;
  }

  if (!rawBody) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", config.reclaimWebhookSecret)
    .update(rawBody)
    .digest("hex");

  const providedSignature = payload.signature.startsWith("0x")
    ? payload.signature.slice(2)
    : payload.signature;
  const normalizedProvidedSignature = providedSignature.toLowerCase();

  const hexSignaturePattern = /^[a-f0-9]+$/;
  if (!hexSignaturePattern.test(normalizedProvidedSignature)) {
    return false;
  }

  if (expectedSignature.length !== normalizedProvidedSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, "hex"),
    Buffer.from(normalizedProvidedSignature, "hex"),
  );
}
