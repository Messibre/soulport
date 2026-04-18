import { config } from "../config.js";
import type { MatchResult, SkillScore } from "../types.js";

type FreelancerProfile = {
  address: string;
  reputationScore: number;
  verifiedSkills: SkillScore[];
  sbtMetadataHashes: string[];
};

const cachedMatches = new Map<
  string,
  { timestamp: number; results: MatchResult[] }
>();
const cacheTtlMs = 5 * 60 * 1000;

export class MatchmakerService {
  constructor(private readonly matchLimit = config.aiMatchLimit) {}

  async matchFreelancers(jobDescription: string): Promise<MatchResult[]> {
    const cacheKey = jobDescription.trim().toLowerCase();
    const cached = cachedMatches.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheTtlMs) {
      return cached.results;
    }

    const keywords = this.extractKeywords(jobDescription);
    const candidates = await this.fetchCandidateProfiles();
    const scored = candidates
      .map((profile) => this.scoreProfile(profile, keywords))
      .sort((left, right) => right.score - left.score)
      .slice(0, this.matchLimit);

    cachedMatches.set(cacheKey, { timestamp: Date.now(), results: scored });
    return scored;
  }

  extractKeywords(jobDescription: string): string[] {
    const stopWords = new Set([
      "the",
      "and",
      "for",
      "with",
      "that",
      "this",
      "from",
      "have",
      "need",
      "able",
      "will",
      "your",
      "about",
      "into",
      "using",
      "looking",
    ]);

    return Array.from(
      new Set(
        jobDescription
          .toLowerCase()
          .replace(/[^a-z0-9\s+.-]/g, " ")
          .split(/\s+/)
          .filter((word) => word.length > 2 && !stopWords.has(word)),
      ),
    );
  }

  async fetchCandidateProfiles(): Promise<FreelancerProfile[]> {
    return [
      {
        address: "0x1111111111111111111111111111111111111111",
        reputationScore: 91,
        verifiedSkills: [
          {
            skill: "Solidity",
            confidence: 92,
            reasons: ["Onchain contract activity"],
          },
          {
            skill: "DeFi Expert",
            confidence: 85,
            reasons: ["DeFi protocol usage"],
          },
        ],
        sbtMetadataHashes: ["QmSolidityBadge"],
      },
      {
        address: "0x2222222222222222222222222222222222222222",
        reputationScore: 84,
        verifiedSkills: [
          {
            skill: "NFT Operator",
            confidence: 90,
            reasons: ["NFT marketplace interactions"],
          },
          {
            skill: "Community Manager",
            confidence: 78,
            reasons: ["Review and credential signals"],
          },
        ],
        sbtMetadataHashes: ["QmNFTBadge"],
      },
      {
        address: "0x3333333333333333333333333333333333333333",
        reputationScore: 77,
        verifiedSkills: [
          {
            skill: "Gaming",
            confidence: 88,
            reasons: ["Gaming protocol interactions"],
          },
          {
            skill: "Frontend",
            confidence: 74,
            reasons: ["Design and app workflow signals"],
          },
        ],
        sbtMetadataHashes: ["QmGamingBadge"],
      },
    ];
  }

  private scoreProfile(
    profile: FreelancerProfile,
    keywords: string[],
  ): MatchResult {
    const skillNames = profile.verifiedSkills.map((skill) =>
      skill.skill.toLowerCase(),
    );
    const keywordHits = keywords.filter((keyword) =>
      skillNames.some(
        (skillName) =>
          skillName.includes(keyword) || keyword.includes(skillName),
      ),
    );

    const skillMatchCount = keywordHits.length;
    const score = Math.round(
      profile.reputationScore * 0.6 + skillMatchCount * 0.4 * 100,
    );

    return {
      address: profile.address,
      score,
      skills: profile.verifiedSkills,
      reputationScore: profile.reputationScore,
      reason:
        keywordHits.length > 0
          ? `matchScore=(0.6*${profile.reputationScore})+(0.4*${skillMatchCount}); matched keywords: ${keywordHits.join(", ")}`
          : `matchScore=(0.6*${profile.reputationScore})+(0.4*0); ranked by reputation and skill overlap`,
    };
  }
}
