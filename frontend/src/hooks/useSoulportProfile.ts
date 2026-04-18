import { useMemo } from "react";
import { formatEther } from "viem";
import { useAccount, useReadContract, useReadContracts } from "wagmi";

import {
  REPUTATION_ORACLE_ADDRESS,
  SOULPORT_SBT_ADDRESS,
  STAKING_ADDRESS,
  reputationOracleAbi,
  soulPortSbtAbi,
  stakingAbi,
} from "../web3/contracts";

const DEMO_BADGES = [
  {
    id: 1n,
    name: "LinkedIn Work History",
    image: "https://picsum.photos/seed/linkedin/300/300",
    metadata: "QmLinkedInBadge",
  },
  {
    id: 7n,
    name: "AI Verified Skill",
    image: "https://picsum.photos/seed/skills/300/300",
    metadata: "QmSkillBadge",
  },
  {
    id: 9n,
    name: "Reputation Milestone",
    image: "https://picsum.photos/seed/reputation/300/300",
    metadata: "QmReputationBadge",
  },
  {
    id: 100n,
    name: "Top Talent",
    image: "https://picsum.photos/seed/toptalent/300/300",
    metadata: "QmTopBadge",
  },
] as const;

export function useSoulportProfile() {
  const { address, isConnected } = useAccount();

  const enabled = Boolean(address && isConnected);
  const hasContracts =
    SOULPORT_SBT_ADDRESS.length > 0 &&
    REPUTATION_ORACLE_ADDRESS.length > 0 &&
    STAKING_ADDRESS.length > 0;

  const balanceReads = useReadContracts({
    allowFailure: true,
    query: { enabled: enabled && hasContracts },
    contracts: DEMO_BADGES.map((badge) => ({
      address: SOULPORT_SBT_ADDRESS,
      abi: soulPortSbtAbi,
      functionName: "balanceOf",
      args: [address as `0x${string}`, badge.id],
    })),
  });

  const reputationRead = useReadContract({
    address: REPUTATION_ORACLE_ADDRESS,
    abi: reputationOracleAbi,
    functionName: "getCombinedReputationScore",
    args: [address as `0x${string}`],
    query: { enabled: enabled && hasContracts },
  });

  const stakingInfoRead = useReadContract({
    address: STAKING_ADDRESS,
    abi: stakingAbi,
    functionName: "stakingInfo",
    args: [address as `0x${string}`],
    query: { enabled: enabled && hasContracts },
  });

  const weightRead = useReadContract({
    address: STAKING_ADDRESS,
    abi: stakingAbi,
    functionName: "getReputationWeight",
    args: [address as `0x${string}`],
    query: { enabled: enabled && hasContracts },
  });

  const badges = useMemo(() => {
    const balances =
      balanceReads.data?.map((item) => {
        if (item.status === "success") {
          return (item.result as bigint) || 0n;
        }
        return 0n;
      }) ?? [];

    const minted = DEMO_BADGES.map((badge, index) => ({
      ...badge,
      amount: balances[index] ?? 0n,
    })).filter((badge) => badge.amount > 0n);

    if (minted.length > 0) {
      return minted;
    }

    if (!enabled) {
      return DEMO_BADGES.map((badge) => ({ ...badge, amount: 1n }));
    }

    return [];
  }, [balanceReads.data, enabled]);

  const reputationScore = reputationRead.data
    ? Number(reputationRead.data)
    : enabled
      ? 0
      : 782;

  const stakingInfo = useMemo(() => {
    if (stakingInfoRead.data) {
      const [amount, timestamp, lockPeriod] = stakingInfoRead.data as readonly [
        bigint,
        bigint,
        bigint,
      ];
      return {
        amount,
        amountEth: Number(formatEther(amount)),
        timestamp,
        lockPeriod,
        unlockAt: Number(timestamp + lockPeriod) * 1000,
      };
    }

    if (!enabled) {
      const now = Date.now();
      return {
        amount: 1500000000000000000n,
        amountEth: 1.5,
        timestamp: BigInt(Math.floor(now / 1000) - 86400 * 12),
        lockPeriod: BigInt(86400 * 30),
        unlockAt: now + 86400 * 18 * 1000,
      };
    }

    return {
      amount: 0n,
      amountEth: 0,
      timestamp: 0n,
      lockPeriod: 0n,
      unlockAt: 0,
    };
  }, [stakingInfoRead.data, enabled]);

  const weightMultiplier = useMemo(() => {
    if (weightRead.data) {
      return Number(weightRead.data) / 1e18;
    }

    return enabled ? 1 : 1.5;
  }, [weightRead.data, enabled]);

  const isLoading =
    balanceReads.isLoading ||
    reputationRead.isLoading ||
    stakingInfoRead.isLoading;

  const refresh = () => {
    void balanceReads.refetch();
    void reputationRead.refetch();
    void stakingInfoRead.refetch();
    void weightRead.refetch();
  };

  return {
    address,
    isConnected,
    isLoading,
    badges,
    reputationScore,
    stakingInfo,
    weightMultiplier,
    refresh,
  };
}
