export type MetadataAttribute = {
  trait_type: string;
  value: string | number | boolean;
};

export type SbtMetadata = {
  name: string;
  description: string;
  platform: string;
  externalId: string;
  proofHash: string;
  timestamp: string;
  attributes: MetadataAttribute[];
};

export type ReclaimProofPayload = {
  signature: string;
  proofHash: string;
  user: {
    address: string;
    name: string;
    title: string;
    dates?: string;
  };
  platform: string;
  externalId: string;
  attributes?: MetadataAttribute[];
};

export type WorldIdVerificationPayload = {
  nullifierHash: string;
  proof: string;
  signal: string;
  merkleRoot?: string;
};

export type SkillScore = {
  skill: string;
  confidence: number;
  reasons: string[];
};

export type ReviewAnalysis = {
  credibilityScore: number;
  flagged: boolean;
  reasons: string[];
};

export type MatchResult = {
  address: string;
  score: number;
  skills: SkillScore[];
  reputationScore: number;
  reason: string;
};
