import { Share2 } from "lucide-react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";

import { AttestationViewer } from "../components/AttestationViewer";
import { BadgeGrid } from "../components/BadgeGrid";
import { useSoulportProfile } from "../hooks/useSoulportProfile";

export function ProfilePage() {
  const { address: routeAddress } = useParams();
  const { address, badges, reputationScore, stakingInfo, weightMultiplier } =
    useSoulportProfile();

  const profileAddress =
    routeAddress || address || "0x0000000000000000000000000000000000000000";

  const share = async () => {
    const shareUrl = `${window.location.origin}/profile/${profileAddress}`;
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Profile link copied");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="card border border-base-300 bg-base-200/70">
        <div className="card-body">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Public Profile</h1>
              <p className="text-xs opacity-70 break-all mt-1">
                {profileAddress}
              </p>
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => void share()}
            >
              <Share2 className="size-4" />
              Share
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-base-300 bg-base-100 p-4">
              <p className="text-xs uppercase opacity-60">Reputation</p>
              <p className="mt-2 text-3xl font-black">{reputationScore}</p>
            </div>
            <div className="rounded-xl border border-base-300 bg-base-100 p-4">
              <p className="text-xs uppercase opacity-60">Stake</p>
              <p className="mt-2 text-3xl font-black">
                {stakingInfo.amountEth.toFixed(2)} ETH
              </p>
            </div>
            <div className="rounded-xl border border-base-300 bg-base-100 p-4">
              <p className="text-xs uppercase opacity-60">Weight</p>
              <p className="mt-2 text-3xl font-black">
                {weightMultiplier.toFixed(2)}x
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-xl font-bold">Minted Badges</h2>
        <BadgeGrid badges={badges} />
      </section>

      <section className="mt-6">
        <AttestationViewer address={profileAddress as `0x${string}`} />
      </section>
    </div>
  );
}
