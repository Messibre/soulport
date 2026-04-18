export const SOULPORT_SBT_ADDRESS = (process.env.REACT_APP_SBT_ADDRESS ||
  "") as `0x${string}`;
export const REPUTATION_ORACLE_ADDRESS = (process.env
  .REACT_APP_REPUTATION_ORACLE_ADDRESS || "") as `0x${string}`;
export const STAKING_ADDRESS = (process.env.REACT_APP_STAKING_ADDRESS ||
  "") as `0x${string}`;

export const soulPortSbtAbi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const reputationOracleAbi = [
  {
    name: "getCombinedReputationScore",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const stakingAbi = [
  {
    name: "stake",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "lockPeriodDays", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "unstake",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "stakingInfo",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "amount", type: "uint256" },
      { name: "timestamp", type: "uint256" },
      { name: "lockPeriod", type: "uint256" },
    ],
  },
  {
    name: "getReputationWeight",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
