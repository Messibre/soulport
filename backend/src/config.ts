import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const environmentSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  NODE_ENV: z.string().default("development"),
  PINATA_JWT: z.string().optional().default(""),
  PINATA_GATEWAY_URL: z
    .string()
    .url()
    .default("https://gateway.pinata.cloud/ipfs/"),
  RECLAIM_WEBHOOK_SECRET: z.string().optional().default(""),
  WORLD_ID_APP_ID: z.string().optional().default(""),
  WORLD_ID_ACTION: z.string().optional().default(""),
  WORLD_ID_API_URL: z.string().url().default("https://api.worldid.org"),
  ALCHEMY_RPC_URL: z.string().optional().default(""),
  ALCHEMY_API_KEY: z.string().optional().default(""),
  DATABASE_URL: z.string().default("file:./data/soulport.db"),
  AI_MATCH_LIMIT: z.coerce.number().int().positive().max(100).default(20),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
});

const parsedEnvironment = environmentSchema.parse(process.env);

export const config = {
  port: parsedEnvironment.PORT,
  corsOrigin: parsedEnvironment.CORS_ORIGIN,
  nodeEnv: parsedEnvironment.NODE_ENV,
  pinataJwt: parsedEnvironment.PINATA_JWT,
  pinataGatewayUrl: parsedEnvironment.PINATA_GATEWAY_URL,
  reclaimWebhookSecret: parsedEnvironment.RECLAIM_WEBHOOK_SECRET,
  worldIdAppId: parsedEnvironment.WORLD_ID_APP_ID,
  worldIdAction: parsedEnvironment.WORLD_ID_ACTION,
  worldIdApiUrl: parsedEnvironment.WORLD_ID_API_URL,
  alchemyRpcUrl: parsedEnvironment.ALCHEMY_RPC_URL,
  alchemyApiKey: parsedEnvironment.ALCHEMY_API_KEY,
  databaseUrl: parsedEnvironment.DATABASE_URL,
  aiMatchLimit: parsedEnvironment.AI_MATCH_LIMIT,
  rateLimitWindowMs: parsedEnvironment.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: parsedEnvironment.RATE_LIMIT_MAX,
} as const;
