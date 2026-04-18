export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3001";

export type Skill = {
  skill: string;
  confidence: number;
  reasons: string[];
};

export type Match = {
  address: string;
  score: number;
  title?: string;
  reason?: string;
};

export type ReclaimProofPayload = {
  signature: string;
  proofHash: string;
  user: {
    address: `0x${string}`;
    name: string;
    title: string;
    dates?: string;
  };
  platform: string;
  externalId: string;
  attributes?: Array<{ trait_type: string; value: string | number | boolean }>;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const data = (await response.json()) as {
        error?: string;
        message?: string;
      };
      message = data.error || data.message || message;
    } catch {
      const text = await response.text();
      if (text) {
        message = text;
      }
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function verifySkills(address: `0x${string}`) {
  return request<{ address: string; skills: Skill[] }>(
    `/api/ai/verify-skills/${address}`,
  );
}

export async function getMatches(jobDescription: string) {
  return request<{ jobHash: string; matches: Match[] }>(`/api/ai/match`, {
    method: "POST",
    body: JSON.stringify({ jobDescription }),
  });
}

export async function analyzeReview(
  reviewText: string,
  address?: `0x${string}`,
) {
  return request<{
    credibilityScore: number;
    flagged: boolean;
    reasons: string[];
  }>("/api/ai/analyze-review", {
    method: "POST",
    body: JSON.stringify({ reviewText, address }),
  });
}

export async function submitReclaimProof(payload: ReclaimProofPayload) {
  return request<{ metadataHash: string; metadata: unknown }>(
    "/api/reclaim/proof",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}
