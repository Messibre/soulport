import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";

import { submitReclaimProof } from "../lib/api";

type ImportWizardModalProps = {
  open: boolean;
  onClose: () => void;
};

const platforms = ["LinkedIn", "GitHub", "Coursera", "Behance", "Dribbble"];

export function ImportWizardModal({ open, onClose }: ImportWizardModalProps) {
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState(1);
  const [platform, setPlatform] = useState(platforms[0]);
  const [busy, setBusy] = useState(false);
  const [metadataHash, setMetadataHash] = useState<string>("");

  const preview = useMemo(
    () => ({
      title: `${platform} Experience: Senior Product Designer`,
      dates: "2023-01 to Present",
      description:
        "Built design systems and led UX delivery for web3 growth products.",
    }),
    [platform],
  );

  const next = () => setStep((current) => Math.min(6, current + 1));
  const back = () => setStep((current) => Math.max(1, current - 1));

  const runAsyncStep = async () => {
    setBusy(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setBusy(false);
    next();
  };

  const mintSbt = async () => {
    if (!isConnected || !address) {
      toast.error("Connect wallet before minting");
      return;
    }

    setBusy(true);
    toast.loading("Sending mint transaction...", { id: "mint" });
    try {
      const proofHash = `proof-${Date.now().toString(16)}`;
      const signature = "f".repeat(64);

      const response = await submitReclaimProof({
        signature,
        proofHash,
        user: {
          address,
          name: "SoulPort User",
          title: preview.title,
          dates: preview.dates,
        },
        platform: platform.toLowerCase(),
        externalId: `demo-${platform.toLowerCase()}-${address.slice(2, 8)}`,
        attributes: [
          { trait_type: "title", value: preview.title },
          { trait_type: "dates", value: preview.dates },
          { trait_type: "description", value: preview.description },
        ],
      });

      setMetadataHash(response.metadataHash);
      toast.success("SBT minted and proof pinned to IPFS", { id: "mint" });
      onClose();
      setStep(1);
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "Mint flow failed";
      toast.error(message, { id: "mint" });
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl bg-base-100 border border-base-300">
        <h3 className="font-bold text-xl">Web2 Import Wizard</h3>
        <progress
          className="progress progress-primary mt-4 w-full"
          value={(step / 6) * 100}
          max="100"
        />

        <div className="mt-6 space-y-4">
          {step === 1 && (
            <div>
              <p className="mb-3">Step 1: Select platform</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {platforms.map((item) => (
                  <button
                    key={item}
                    className={`btn ${item === platform ? "btn-primary" : "btn-outline"}`}
                    onClick={() => setPlatform(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <p>
              Step 2: Connect your {platform} account via secure OAuth or QR
              flow.
            </p>
          )}
          {step === 3 && (
            <p>Step 3: Scan QR / complete OAuth on your mobile device.</p>
          )}
          {step === 4 && (
            <p>
              Step 4: Reclaim generates a ZK proof for your imported profile
              data.
            </p>
          )}

          {step === 5 && (
            <div className="rounded-xl border border-base-300 bg-base-200 p-4">
              <p className="text-sm opacity-70">
                Step 5: Preview extracted data
              </p>
              <p className="mt-2 font-semibold">{preview.title}</p>
              <p className="text-sm opacity-75">{preview.dates}</p>
              <p className="mt-2 text-sm">{preview.description}</p>
            </div>
          )}

          {step === 6 && (
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
              <p className="font-semibold">Step 6: Mint as SBT</p>
              <p className="mt-1 text-sm opacity-80">
                Proof hash will be pinned to IPFS and linked to your SoulPort
                profile.
              </p>
              {metadataHash && (
                <p className="mt-2 text-xs opacity-80">
                  Metadata hash: {metadataHash}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          {step > 1 && step < 6 && (
            <button className="btn btn-outline" onClick={back} disabled={busy}>
              Back
            </button>
          )}
          {step < 2 && (
            <button className="btn btn-primary" onClick={next}>
              Continue
            </button>
          )}
          {step >= 2 && step < 5 && (
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={runAsyncStep}
            >
              {busy ? "Processing..." : "Continue"}
            </button>
          )}
          {step === 5 && (
            <button className="btn btn-primary" onClick={next}>
              Continue
            </button>
          )}
          {step === 6 && (
            <button
              className="btn btn-success"
              disabled={busy}
              onClick={mintSbt}
            >
              {busy ? "Minting..." : "Mint as SBT"}
            </button>
          )}
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
