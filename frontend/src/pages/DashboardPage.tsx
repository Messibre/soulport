import { useMemo, useState } from "react";
import { ExternalLink, PlusCircle, UploadCloud } from "lucide-react";
import { Link } from "react-router-dom";

import { AttestationViewer } from "../components/AttestationViewer";
import { BadgeGrid } from "../components/BadgeGrid";
import { ImportWizardModal } from "../components/ImportWizardModal";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { MatchmakerCard } from "../components/MatchmakerCard";
import { SkillVerifierCard } from "../components/SkillVerifierCard";
import { StakingModal } from "../components/StakingModal";
import { UnstakeModal } from "../components/UnstakeModal";
import { useSoulportProfile } from "../hooks/useSoulportProfile";

export function DashboardPage() {
  const {
    address,
    badges,
    isConnected,
    isLoading,
    reputationScore,
    stakingInfo,
    weightMultiplier,
    refresh,
  } = useSoulportProfile();

  const [importOpen, setImportOpen] = useState(false);
  const [stakeOpen, setStakeOpen] = useState(false);
  const [unstakeOpen, setUnstakeOpen] = useState(false);

  const profilePath = useMemo(
    () => (address ? `/profile/${address}` : "/profile/demo"),
    [address],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card border border-base-300 bg-base-200/70 lg:col-span-2">
          <div className="card-body">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-sm opacity-75">
                  Manage your SoulPort reputation profile and verifications.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setImportOpen(true)}
                >
                  <UploadCloud className="size-4" />
                  Import Web2 Data
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setStakeOpen(true)}
                >
                  <PlusCircle className="size-4" />
                  Stake More
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <article className="rounded-xl border border-base-300 bg-base-100 p-4">
                <p className="text-xs uppercase opacity-60">Reputation Score</p>
                {isLoading ? (
                  <LoadingSkeleton lines={1} />
                ) : (
                  <p className="mt-2 text-3xl font-black">{reputationScore}</p>
                )}
              </article>
              <article className="rounded-xl border border-base-300 bg-base-100 p-4">
                <p className="text-xs uppercase opacity-60">Staked</p>
                <p className="mt-2 text-3xl font-black">
                  {stakingInfo.amountEth.toFixed(2)} ETH
                </p>
              </article>
              <article className="rounded-xl border border-base-300 bg-base-100 p-4">
                <p className="text-xs uppercase opacity-60">
                  Weight Multiplier
                </p>
                <p className="mt-2 text-3xl font-black">
                  {weightMultiplier.toFixed(2)}x
                </p>
              </article>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setUnstakeOpen(true)}
              >
                Unstake
              </button>
              <a
                className="btn btn-ghost btn-sm"
                href="https://base-sepolia.easscan.org"
                target="_blank"
                rel="noreferrer"
              >
                View Attestations
                <ExternalLink className="size-3.5" />
              </a>
              <Link className="btn btn-ghost btn-sm" to={profilePath}>
                Share Profile
              </Link>
            </div>
          </div>
        </section>

        <section className="card border border-base-300 bg-base-200/70">
          <div className="card-body">
            <h2 className="card-title">Wallet status</h2>
            <p className="text-sm opacity-80">
              {isConnected
                ? `Connected as ${address}`
                : "Connect wallet to fetch live contract data."}
            </p>
            <div
              className="tooltip"
              data-tip="World ID and proof checks happen server-side."
            >
              <span className="badge badge-outline mt-2">
                Sybil-resistant profile
              </span>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-xl font-bold">Your SBT Badges</h2>
        {isLoading ? (
          <LoadingSkeleton lines={4} />
        ) : (
          <BadgeGrid badges={badges} />
        )}
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <SkillVerifierCard />
        <MatchmakerCard />
      </div>

      <div className="mt-6">
        <AttestationViewer address={address} />
      </div>

      <ImportWizardModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />
      <StakingModal
        open={stakeOpen}
        onClose={() => setStakeOpen(false)}
        onSuccess={refresh}
      />
      <UnstakeModal
        open={unstakeOpen}
        onClose={() => setUnstakeOpen(false)}
        unlockAt={stakingInfo.unlockAt}
        onSuccess={refresh}
      />
    </div>
  );
}
