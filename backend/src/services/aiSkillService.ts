import { config } from "../config.js";
import type { SkillScore } from "../types.js";

export type WalletActivity = {
  protocol?: string;
  contractName?: string;
  method?: string;
  assetType?: string;
  valueUsd?: number;
};

type CachedSkillResult = {
  expiresAt: number;
  skills: SkillScore[];
};

const skillCache = new Map<string, CachedSkillResult>();
const skillCacheTtlMs = 10 * 60 * 1000;

export class AiSkillService {
  constructor(private readonly rpcUrl = config.alchemyRpcUrl) {}

  async verifySkills(address: string): Promise<SkillScore[]> {
    const cacheKey = address.toLowerCase();
    const cached = skillCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.skills;
    }

    const activities = await this.fetchWalletActivity(address);
    const skills = this.classifySkills(activities);
    skillCache.set(cacheKey, {
      expiresAt: Date.now() + skillCacheTtlMs,
      skills,
    });

    return skills;
  }

  async fetchWalletActivity(address: string): Promise<WalletActivity[]> {
    void address;
    void this.rpcUrl;

    return [
      {
        protocol: "UniswapV3",
        contractName: "Uniswap V3 Pool",
        method: "swapExactInputSingle",
        valueUsd: 1250,
      },
      {
        protocol: "Aave",
        contractName: "Aave V3 Pool",
        method: "supply",
        valueUsd: 4500,
      },
      {
        protocol: "OpenSea",
        contractName: "OpenSea Seaport",
        method: "fulfillBasicOrder",
        assetType: "NFT",
        valueUsd: 900,
      },
    ];
  }

  classifySkills(activities: WalletActivity[]): SkillScore[] {
    const txCount = activities.length;
    const hasUniswapV3 = activities.some(
      (activity) =>
        `${activity.protocol ?? ""} ${activity.contractName ?? ""}`
          .toLowerCase()
          .includes("uniswapv3") ||
        `${activity.protocol ?? ""} ${activity.contractName ?? ""}`
          .toLowerCase()
          .includes("uniswap v3"),
    );

    const normalized = activities.flatMap((activity) => {
      const skills: SkillScore[] = [];
      const protocol =
        `${activity.protocol ?? ""} ${activity.contractName ?? ""}`.toLowerCase();

      if (
        protocol.includes("uniswap") ||
        protocol.includes("aave") ||
        protocol.includes("curve")
      ) {
        skills.push({
          skill: "DeFi Expert",
          confidence: 85,
          reasons: [
            "Observed DeFi protocol interactions",
            "Executed liquidity or lending actions",
          ],
        });
      }

      if (
        protocol.includes("opensea") ||
        protocol.includes("nft") ||
        activity.assetType === "NFT"
      ) {
        skills.push({
          skill: "NFT Operator",
          confidence: 78,
          reasons: ["Observed NFT marketplace or asset interactions"],
        });
      }

      if (
        protocol.includes("uniswap") ||
        activity.method?.includes("swap") ||
        activity.method?.includes("liquidity")
      ) {
        skills.push({
          skill: "Onchain Trader",
          confidence: 74,
          reasons: ["Observed swap / liquidity activity"],
        });
      }

      if (activity.valueUsd && activity.valueUsd > 5000) {
        skills.push({
          skill: "High-Value Operator",
          confidence: 70,
          reasons: ["Large transaction volume observed"],
        });
      }

      return skills;
    });

    const deduped = new Map<string, SkillScore>();
    for (const skill of normalized) {
      const existing = deduped.get(skill.skill);
      if (!existing || existing.confidence < skill.confidence) {
        deduped.set(skill.skill, skill);
      }
    }

    if (txCount > 100 && hasUniswapV3) {
      deduped.set("DeFi Enthusiast", {
        skill: "DeFi Enthusiast",
        confidence: 86,
        reasons: ["Transaction count above 100", "Interacted with Uniswap V3"],
      });
    }

    return [...deduped.values()].sort(
      (left, right) => right.confidence - left.confidence,
    );
  }
}
