import { useEffect } from "react";
import toast from "react-hot-toast";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { STAKING_ADDRESS, stakingAbi } from "../web3/contracts";

type UnstakeModalProps = {
  open: boolean;
  onClose: () => void;
  unlockAt?: number;
  onSuccess?: () => void;
};

export function UnstakeModal({
  open,
  onClose,
  unlockAt,
  onSuccess,
}: UnstakeModalProps) {
  const { isConnected } = useAccount();
  const { data: hash, isPending, writeContract } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({
    hash,
    query: { enabled: Boolean(hash) },
  });

  if (!open) return null;

  const msLeft = unlockAt ? unlockAt - Date.now() : 0;
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

  const submitUnstake = () => {
    if (!isConnected) {
      toast.error("Connect wallet first");
      return;
    }

    if (!STAKING_ADDRESS) {
      toast.error("Missing staking contract address");
      return;
    }

    try {
      toast.loading("Confirm unstake transaction in wallet...", {
        id: "unstake",
      });
      writeContract({
        address: STAKING_ADDRESS,
        abi: stakingAbi,
        functionName: "unstake",
        args: [],
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit transaction", { id: "unstake" });
    }
  };

  useEffect(() => {
    if (receipt.isSuccess) {
      toast.success("Unstake confirmed", { id: "unstake" });
      onSuccess?.();
      onClose();
    }
  }, [receipt.isSuccess, onClose, onSuccess]);

  useEffect(() => {
    if (receipt.isError) {
      toast.error("Unstake transaction failed", { id: "unstake" });
    }
  }, [receipt.isError]);

  return (
    <dialog className="modal modal-open">
      <div className="modal-box border border-base-300 bg-base-100">
        <h3 className="font-bold text-lg">Unstake</h3>
        <p className="mt-3 opacity-80">
          {daysLeft > 0
            ? `Your current lock ends in about ${daysLeft} day(s).`
            : "Your stake is ready to unstake."}
        </p>

        <div className="mt-4 rounded-lg border border-base-300 bg-base-200 p-4 text-sm">
          <p className="font-semibold">Recent staking activity</p>
          <ul className="mt-2 space-y-2 opacity-80">
            <li>+1.00 ETH staked · 2026-04-10</li>
            <li>+0.50 ETH staked · 2026-03-18</li>
            <li className="text-warning">No slashing events detected</li>
          </ul>
        </div>

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <button
            className="btn btn-error"
            disabled={daysLeft > 0 || isPending || receipt.isLoading}
            onClick={submitUnstake}
          >
            {isPending || receipt.isLoading ? "Submitting..." : "Unstake now"}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
