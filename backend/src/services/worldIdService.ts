import { config } from "../config.js";
import { database } from "../db.js";

export type WorldIdVerificationResult = {
  success: boolean;
  nullifierHash: string;
  reason?: string;
};

export class WorldIdService {
  constructor(private readonly apiUrl = config.worldIdApiUrl) {}

  async verify(payload: {
    nullifierHash: string;
    proof: string;
    signal: string;
    merkleRoot?: string;
  }): Promise<WorldIdVerificationResult> {
    const existingNullifier = database
      .prepare(
        "SELECT nullifier_hash FROM worldid_nullifiers WHERE nullifier_hash = ?",
      )
      .get(payload.nullifierHash) as { nullifier_hash: string } | undefined;

    if (existingNullifier) {
      return {
        success: false,
        nullifierHash: payload.nullifierHash,
        reason: "Nullifier already used",
      };
    }

    const response = await fetch(`${this.apiUrl}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: config.worldIdAppId,
        action: config.worldIdAction,
        nullifier_hash: payload.nullifierHash,
        proof: payload.proof,
        signal: payload.signal,
        merkle_root: payload.merkleRoot,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        nullifierHash: payload.nullifierHash,
        reason: `World ID API rejected the proof (${response.status})`,
      };
    }

    const body = (await response.json()) as { success?: boolean };
    if (!body.success) {
      return {
        success: false,
        nullifierHash: payload.nullifierHash,
        reason: "World ID verification failed",
      };
    }

    database
      .prepare(
        `INSERT INTO worldid_nullifiers (nullifier_hash, signal, created_at) VALUES (?, ?, ?)`,
      )
      .run(payload.nullifierHash, payload.signal, new Date().toISOString());

    return {
      success: true,
      nullifierHash: payload.nullifierHash,
    };
  }
}
