import cors from "cors";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { ZodError } from "zod";

import { config } from "./config.js";
import { initializeDatabase } from "./db.js";
import { createRoutes } from "./routes.js";

export const app = express();

initializeDatabase();

app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  }),
);
app.use(
  express.json({
    limit: "1mb",
    verify: (request, _response, buffer) => {
      (request as Request).rawBody = buffer.toString("utf8");
    },
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(
  rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use((request, _response, next) => {
  const requestId = crypto.randomUUID();
  request.requestId = requestId;
  _response.setHeader("x-request-id", requestId);

  const startedAt = Date.now();
  console.log(
    JSON.stringify({
      level: "info",
      timestamp: new Date().toISOString(),
      event: "request_started",
      requestId,
      method: request.method,
      path: request.originalUrl,
      ip: request.ip,
    }),
  );

  const timeout = setTimeout(() => {
    if (!_response.headersSent) {
      _response.status(504).json({ error: "Request timeout", requestId });
    }
  }, config.requestTimeoutMs);

  _response.on("finish", () => {
    clearTimeout(timeout);
    const elapsedMs = Date.now() - startedAt;
    console.log(
      JSON.stringify({
        level: "info",
        timestamp: new Date().toISOString(),
        event: "request_finished",
        requestId,
        method: request.method,
        path: request.originalUrl,
        statusCode: _response.statusCode,
        elapsedMs,
      }),
    );
  });
  next();
});

app.use("/api", createRoutes());

app.use(
  (
    error: unknown,
    request: Request,
    response: Response,
    _next: NextFunction,
  ) => {
    const requestId = request.requestId ?? "unknown";
    console.error(
      JSON.stringify({
        level: "error",
        timestamp: new Date().toISOString(),
        event: "request_failed",
        requestId,
        path: request.originalUrl,
        method: request.method,
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    );

    const message =
      config.nodeEnv === "production"
        ? "Internal server error"
        : error instanceof Error
          ? error.message
          : "Internal server error";

    if (error instanceof ZodError) {
      return response.status(400).json({
        error: "Invalid request payload",
        details: error.issues,
        requestId,
      });
    }

    response.status(500).json({ error: message, requestId });
  },
);

const executedFileUrl = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined;

if (import.meta.url === executedFileUrl) {
  app.listen(config.port, () => {
    console.log(`SoulPort backend listening on port ${config.port}`);
  });
}
