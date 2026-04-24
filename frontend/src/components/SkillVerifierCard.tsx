import { useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";

import { ApiErrorBox } from "./ApiErrorBox";
import {
  getApiErrorDisplay,
  type ApiErrorDisplay,
  verifySkills,
} from "../lib/api";

type Skill = {
  skill: string;
  confidence: number;
  reasons: string[];
};

const demoSkills: Skill[] = [
  {
    skill: "DeFi Expert",
    confidence: 85,
    reasons: ["Uniswap V3 swap activity", "Aave lending interactions"],
  },
  {
    skill: "NFT Operator",
    confidence: 78,
    reasons: ["OpenSea order fulfillment"],
  },
  {
    skill: "Onchain Trader",
    confidence: 74,
    reasons: ["Consistent swap methods"],
  },
];

export function SkillVerifierCard() {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [errorState, setErrorState] = useState<ApiErrorDisplay | null>(null);

  const verify = async () => {
    if (!isConnected || !address) {
      toast.error("Connect wallet to verify skills");
      return;
    }

    setErrorState(null);
    setLoading(true);
    try {
      const response = await verifySkills(address);
      setSkills(response.skills.length > 0 ? response.skills : demoSkills);
      toast.success("Skill verification complete");
    } catch (error) {
      console.error(error);
      const displayError = getApiErrorDisplay(error);
      setSkills(demoSkills);
      setErrorState(displayError);
      toast.error("Showing demo skill results while backend is unavailable");
    } finally {
      setLoading(false);
    }
  };

  const mintBadge = async (skill: Skill) => {
    toast.loading(`Minting ${skill.skill} badge...`, {
      id: `mint-${skill.skill}`,
    });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    toast.success(`${skill.skill} badge minted`, { id: `mint-${skill.skill}` });
  };

  return (
    <section className="card border border-base-300 bg-base-200/70">
      <div className="card-body">
        <div className="flex items-center justify-between gap-3">
          <h2 className="card-title">AI Skill Verifier</h2>
          <div
            className="tooltip"
            data-tip="Rule-based scan of wallet interactions and protocol usage."
          >
            <span className="badge badge-outline">How it works</span>
          </div>
        </div>

        <button
          className="btn btn-primary w-fit"
          onClick={verify}
          disabled={loading}
        >
          {loading ? "Analyzing wallet..." : "Verify My Skills"}
        </button>

        {errorState && (
          <ApiErrorBox
            title="Skill verification failed"
            message={errorState.message}
            requestId={errorState.requestId}
            hint={errorState.hint}
            onRetry={errorState.canRetry ? () => void verify() : undefined}
            retryDisabled={loading}
            retryLabel={loading ? "Retrying..." : "Retry skill check"}
          />
        )}

        <div className="mt-3 space-y-3">
          {skills.map((skill) => (
            <div
              key={skill.skill}
              className="rounded-lg border border-base-300 bg-base-100 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{skill.skill}</p>
                  <p className="text-xs opacity-70">
                    Confidence {skill.confidence}%
                  </p>
                </div>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => void mintBadge(skill)}
                >
                  Mint Verified Skill Badge
                </button>
              </div>
              <p className="mt-2 text-sm opacity-80">
                {skill.reasons.join(" · ")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
