# Backend

SoulPort off-chain API service.

## Features

- Express server with CORS, logging, and rate limiting
- Reclaim proof ingestion and metadata generation
- World ID verification proxy with nullifier replay protection
- AI skill verification, fraud scoring, and freelancer matching
- SQLite persistence for attestations, proofs, scores, and matches

## Development

1. Copy `.env.example` to `.env`
2. Install dependencies with `npm install`
3. Run the server with `npm run dev`
