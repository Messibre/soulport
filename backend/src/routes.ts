import crypto from "node:crypto";
import { Router } from "express";

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

  router.get("/health", (_request, response) => {
    response.json({
      ok: true,
      service: "soulport-backend",
      timestamp: new Date().toISOString(),
    });
  });

  router.post("/reclaim/proof", async (request, response, next) => {
    try {
      const payload = request.body as ReclaimProofPayload;
      if (
        !payload?.signature ||
        !payload?.proofHash ||
        !payload?.user?.address
      ) {
        return response
          .status(400)
          .json({ error: "Invalid Reclaim proof payload" });
      }

      if (!verifyWebhookSignature(payload, request.rawBody)) {
        return response.status(401).json({ error: "Invalid proof signature" });
      }

      const metadata: SbtMetadata = {
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
      };

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
      const payload = request.body as WorldIdVerificationPayload;
      if (!payload?.nullifierHash || !payload?.proof || !payload?.signal) {
        return response
          .status(400)
          .json({ error: "Invalid World ID verification payload" });
      }

      const result = await worldIdService.verify(payload);
      return response.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return next(error);
    }
  });

  router.get("/ai/verify-skills/:address", async (request, response, next) => {
    try {
      const skills = await aiSkillService.verifySkills(request.params.address);
      const now = new Date().toISOString();

      for (const skill of skills) {
        database
          .prepare(
            `INSERT INTO ai_scores (address, score_type, score, metadata_json, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          )
          .run(
            request.params.address,
            skill.skill,
            skill.confidence,
            JSON.stringify(skill),
            now,
          );
      }

      return response.json({ address: request.params.address, skills });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/ai/analyze-review", (request, response) => {
    const reviewText = String(request.body?.reviewText ?? "");
    if (!reviewText.trim()) {
      return response.status(400).json({ error: "reviewText is required" });
    }

    const result = fraudDetectionService.analyzeReview(reviewText);
    return response.json(result);
  });

  router.post("/ai/match", async (request, response, next) => {
    try {
      const jobDescription = String(request.body?.jobDescription ?? "");
      if (!jobDescription.trim()) {
        return response
          .status(400)
          .json({ error: "jobDescription is required" });
      }

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

  router.get("/metadata/:hash", async (request, response) => {
    const metadataHash = request.params.hash;
    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${metadataHash}`;
    const pinataResponse = await fetch(gatewayUrl);

    if (!pinataResponse.ok) {
      return response.status(404).json({ error: "Metadata not found" });
    }

    const metadata = await pinataResponse.json();
    return response.json({ hash: metadataHash, metadata });
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

  if (expectedSignature.length !== providedSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, "hex"),
    Buffer.from(providedSignature, "hex"),
  );
}
