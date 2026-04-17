import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

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
      request.rawBody = buffer.toString("utf8");
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
  const startedAt = Date.now();
  console.log(
    `[${new Date().toISOString()}] ${request.method} ${request.originalUrl}`,
  );
  _response.on("finish", () => {
    const elapsedMs = Date.now() - startedAt;
    console.log(
      `[${new Date().toISOString()}] ${request.method} ${request.originalUrl} -> ${_response.statusCode} (${elapsedMs}ms)`,
    );
  });
  next();
});

app.use("/api", createRoutes());

app.use(
  (
    error: unknown,
    _request: Request,
    response: Response,
    _next: NextFunction,
  ) => {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error(error);
    response.status(500).json({ error: message });
  },
);

if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(config.port, () => {
    console.log(`SoulPort backend listening on port ${config.port}`);
  });
}
