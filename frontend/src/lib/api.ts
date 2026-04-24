export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3001";

type ApiErrorPayload = {
  error?: string;
  message?: string;
  hint?: string;
  requestId?: string;
  details?: Array<{ message?: string }>;
};

export class ApiError extends Error {
  status: number;
  requestId?: string;
  hint?: string;
  details?: Array<{ message?: string }>;

  constructor(
    message: string,
    options: {
      status: number;
      requestId?: string;
      hint?: string;
      details?: Array<{ message?: string }>;
    },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.requestId = options.requestId;
    this.hint = options.hint;
    this.details = options.details;
  }
}

export type ApiErrorDisplay = {
  message: string;
  requestId?: string;
  hint?: string;
  canRetry: boolean;
};

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
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });
  } catch {
    throw new ApiError(
      "Unable to reach server. Check your connection and retry.",
      {
        status: 0,
      },
    );
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    let requestId: string | undefined;
    let hint: string | undefined;
    let details: Array<{ message?: string }> | undefined;

    try {
      const data = (await response.json()) as ApiErrorPayload;
      message = data.error || data.message || message;
      requestId = data.requestId;
      hint = data.hint;
      details = data.details;

      if (details && details.length > 0) {
        const firstIssue = details[0]?.message;
        if (firstIssue) {
          message = `${message}: ${firstIssue}`;
        }
      }
    } catch {
      const text = await response.text();
      if (text) {
        message = text;
      }
    }

    throw new ApiError(message, {
      status: response.status,
      requestId,
      hint,
      details,
    });
  }

  return (await response.json()) as T;
}

export function getUserFriendlyError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return error.message;
    }

    if (error.status === 400) {
      return `Please check your input and try again. ${error.message}`;
    }

    if (error.status === 401) {
      return "Authentication failed for this operation. Please reconnect and retry.";
    }

    if (error.status === 409) {
      return error.message;
    }

    if (error.status === 429) {
      return "Too many requests. Please wait a minute, then try again.";
    }

    if (error.status === 503 || error.status === 504) {
      return "Service is temporarily unavailable. Please retry shortly.";
    }

    if (error.requestId) {
      return `${error.message} (ref: ${error.requestId})`;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export function getApiErrorDisplay(error: unknown): ApiErrorDisplay {
  if (error instanceof ApiError) {
    const requestId = error.requestId;
    const hint = error.hint;

    if (error.status === 0) {
      return {
        message: "Unable to reach server. Check your connection and retry.",
        requestId,
        hint,
        canRetry: true,
      };
    }

    if (error.status === 400) {
      return {
        message: `Please check your input and try again. ${error.message}`,
        requestId,
        hint,
        canRetry: true,
      };
    }

    if (error.status === 401) {
      return {
        message:
          "Authentication failed for this operation. Please reconnect and retry.",
        requestId,
        hint,
        canRetry: true,
      };
    }

    if (error.status === 409) {
      return {
        message: error.message,
        requestId,
        hint,
        canRetry: false,
      };
    }

    if (error.status === 429) {
      return {
        message: "Too many requests. Please wait a minute, then try again.",
        requestId,
        hint,
        canRetry: true,
      };
    }

    if (error.status === 503 || error.status === 504) {
      return {
        message: "Service is temporarily unavailable. Please retry shortly.",
        requestId,
        hint,
        canRetry: true,
      };
    }

    return {
      message: error.message,
      requestId,
      hint,
      canRetry: true,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      canRetry: true,
    };
  }

  return {
    message: "Something went wrong. Please try again.",
    canRetry: true,
  };
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
