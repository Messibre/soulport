import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import { config } from "./config.js";

const databasePath = config.databaseUrl.startsWith("file:")
  ? config.databaseUrl.replace(/^file:/, "")
  : config.databaseUrl;

const resolvedDatabasePath = path.resolve(databasePath);
const resolvedDirectory = path.dirname(resolvedDatabasePath);
fs.mkdirSync(resolvedDirectory, { recursive: true });

export const database = new Database(resolvedDatabasePath);

database.pragma("journal_mode = WAL");
database.pragma("foreign_keys = ON");

export function initializeDatabase() {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      address TEXT PRIMARY KEY,
      display_name TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attestations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT NOT NULL,
      platform TEXT NOT NULL,
      external_id TEXT NOT NULL,
      metadata_hash TEXT NOT NULL,
      proof_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(address) REFERENCES users(address)
    );

    CREATE TABLE IF NOT EXISTS proofs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT NOT NULL,
      proof_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      verified INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(address) REFERENCES users(address)
    );

    CREATE TABLE IF NOT EXISTS ai_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT NOT NULL,
      score_type TEXT NOT NULL,
      score INTEGER NOT NULL,
      metadata_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(address) REFERENCES users(address)
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_hash TEXT NOT NULL,
      freelancer_address TEXT NOT NULL,
      rank INTEGER NOT NULL,
      score INTEGER NOT NULL,
      metadata_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS worldid_nullifiers (
      nullifier_hash TEXT PRIMARY KEY,
      signal TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_attestations_address_created_at ON attestations(address, created_at);
    CREATE INDEX IF NOT EXISTS idx_proofs_address_created_at ON proofs(address, created_at);
    CREATE INDEX IF NOT EXISTS idx_ai_scores_address_created_at ON ai_scores(address, created_at);
    CREATE INDEX IF NOT EXISTS idx_matches_job_hash_created_at ON matches(job_hash, created_at);
  `);
}
