# Backend

SoulPort off-chain API service.

## Features

- Express server with CORS, logging, and rate limiting
- Reclaim proof ingestion and metadata generation
- World ID verification proxy with nullifier replay protection
- AI skill verification, fraud scoring, and freelancer matching
- SQLite persistence for attestations, proofs, scores, and matches

## API Endpoints

- GET /api/health: Service health check
- POST /api/reclaim/proof: Receive and verify Reclaim proof, generate metadata, upload to IPFS
- POST /api/worldid/verify: Server-side World ID verification with replay prevention
- GET /api/ai/verify-skills/:address: Rule-based skill verification and confidence scores
- POST /api/ai/analyze-review: Review credibility scoring and fraud flagging
- POST /api/ai/match: Match freelancers to a job description
- GET /api/metadata/:hash: Fetch metadata from configured IPFS gateway

## Security Controls

- Environment variables are validated at startup using Zod
- CORS is restricted by CORS_ORIGIN
- Helmet security headers are enabled
- Global and AI-specific rate limits are enforced
- Request IDs and structured logs are emitted for tracing
- Request and external API timeouts are configured
- Reclaim webhook payloads use signature verification
- World ID verification is server-side and prevents nullifier replay
- SQL writes use prepared statements
- Errors are sanitized in production mode

## Development

1. Copy `.env.example` to `.env`
2. Install dependencies with `npm install`
3. Run the server with `npm run dev`
