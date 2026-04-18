import type { ReviewAnalysis } from "../types.js";

const recentReviewHashes = new Map<string, number>();
const reviewHashWindowMs = 60 * 60 * 1000;

const suspiciousPhrases = [
  "great project great project",
  "excellent excellent",
  "100% recommended",
  "best best best",
  "amazing amazing",
  "buy now",
  "click here",
  "guaranteed",
];

const positiveWords = [
  "great",
  "excellent",
  "amazing",
  "recommend",
  "helpful",
  "reliable",
  "fast",
];
const negativeWords = [
  "scam",
  "fraud",
  "fake",
  "bot",
  "spam",
  "terrible",
  "awful",
];

export class FraudDetectionService {
  analyzeReview(reviewText: string): ReviewAnalysis {
    const normalized = reviewText.trim().toLowerCase();
    const reasons: string[] = [];
    let score = 100;

    if (normalized.length < 20) {
      score -= 20;
      reasons.push("Review is very short");
    }

    if (normalized.length > 500) {
      score -= 10;
      reasons.push("Review is unusually long");
    }

    const reviewHash = normalized;
    const existingHashTime = recentReviewHashes.get(reviewHash);
    if (
      existingHashTime &&
      Date.now() - existingHashTime < reviewHashWindowMs
    ) {
      score -= 30;
      reasons.push("Duplicate review text detected");
    }
    recentReviewHashes.set(reviewHash, Date.now());

    for (const phrase of suspiciousPhrases) {
      if (normalized.includes(phrase)) {
        score -= 25;
        reasons.push(`Contains suspicious phrase: ${phrase}`);
      }
    }

    const repeatedTokens = normalized.split(/\s+/).filter(Boolean);
    const uniqueTokens = new Set(repeatedTokens);
    if (
      repeatedTokens.length >= 12 &&
      uniqueTokens.size / repeatedTokens.length < 0.5
    ) {
      score -= 20;
      reasons.push("High token repetition detected");
    }

    const positiveCount = positiveWords.filter((word) =>
      normalized.includes(word),
    ).length;
    const negativeCount = negativeWords.filter((word) =>
      normalized.includes(word),
    ).length;
    score += positiveCount * 2;
    score -= negativeCount * 3;

    const punctuationBurst = (normalized.match(/!/g) ?? []).length;
    if (punctuationBurst > 4) {
      score -= 10;
      reasons.push("Excessive punctuation burst");
    }

    score = Math.max(0, Math.min(100, score));

    if (score < 60) {
      reasons.push("Review fell below the credibility threshold");
    }

    return {
      credibilityScore: score,
      flagged: score < 60,
      reasons,
    };
  }
}
