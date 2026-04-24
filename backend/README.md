# SoulPort Backend

The backend is the trust boundary of SoulPort. It validates external proofs, coordinates AI-like scoring workflows, persists records, and exposes APIs consumed by the frontend.

## Stack

- Node.js + TypeScript
- Express 5
- Better SQLite3
- Zod configuration validation
- Rate limiting + security middleware (Helmet, CORS)

## Core Responsibilities

- Accept and verify Reclaim-style proof payloads
- Generate and upload SBT metadata to IPFS via Pinata
- Verify World ID proofs server-side and prevent nullifier replay
- Serve AI-assisted endpoints for skill scoring, review fraud scoring, and project matching
- Maintain normalized local records for users, proofs, matches, and attestations

## API Summary

- `GET /api/health`
- `POST /api/reclaim/proof`
- `POST /api/worldid/verify`
- `GET /api/ai/verify-skills/:address`
- `POST /api/ai/analyze-review`
- `POST /api/ai/match`
- `GET /api/metadata/:hash`

## Setup

1. Copy `.env.example` to `.env`
2. Install dependencies

```bash
npm install
```

3. Start in development mode

```bash
npm run dev
```

4. Build and run production output

```bash
npm run build
npm run start
```

## Environment Variables

Required and high-impact settings:

- `PORT`
- `CORS_ORIGIN`
- `PINATA_JWT`
- `PINATA_GATEWAY_URL`
- `RECLAIM_WEBHOOK_SECRET`
- `WORLD_ID_APP_ID`
- `WORLD_ID_ACTION`
- `WORLD_ID_API_URL`
- `ALCHEMY_RPC_URL`
- `DATABASE_URL`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`
- `AI_RATE_LIMIT_MAX`
- `REQUEST_TIMEOUT_MS`
- `EXTERNAL_API_TIMEOUT_MS`

## Security Considerations

- Keep all secrets in `.env` only; never commit runtime secret files
- Enforce HTTPS and trusted CORS origins in deployed environments
- Use strong `RECLAIM_WEBHOOK_SECRET` values and rotate periodically
- Keep `WORLD_ID_*` configuration consistent between frontend signal and backend verification
- Audit logs for repeated failed proof attempts and rate-limit abuse

## Data Storage

SQLite schema is initialized automatically on startup in `src/db.ts`.

Local data location defaults to:

- `file:./data/soulport.db`

For production, use a persistent mounted disk path.

## Deploy on Render

This repository includes a Render Blueprint at `render.yaml` configured for the backend service.

1. Push the repository to GitHub.
2. In Render, create a new Blueprint instance from the repo root.
3. Confirm service root is `backend` and the build/start commands are:

```bash
npm install && npm run build
npm run start
```

4. Set required environment variables in Render:

- `CORS_ORIGIN`
- `PINATA_JWT`
- `PINATA_GATEWAY_URL`
- `RECLAIM_WEBHOOK_SECRET`
- `WORLD_ID_APP_ID`
- `WORLD_ID_ACTION`
- `WORLD_ID_API_URL`
- `ALCHEMY_RPC_URL`

5. Keep the persistent disk mount enabled at `/var/data` so SQLite survives restarts.

Health checks use `GET /api/health`.
