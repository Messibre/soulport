import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { parseEther } from "viem";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { STAKING_ADDRESS, stakingAbi } from "../web3/contracts";

type StakingModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

const lockPeriods = [
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "180 days", days: 180 },
];

export function StakingModal({ open, onClose, onSuccess }: StakingModalProps) {
  const { isConnected } = useAccount();
  const [amount, setAmount] = useState("0.5");
  const [days, setDays] = useState(lockPeriods[0].days);
  const [asset, setAsset] = useState("ETH");

  const { data: hash, isPending, writeContract } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({
    hash,
    query: { enabled: Boolean(hash) },
  });

  const multiplier = useMemo(() => {
    const numericAmount = Number(amount);
    if (numericAmount >= 10) return 2;
    if (numericAmount >= 5) return 1.5;
    if (numericAmount >= 1) return 1.2;
    return 1;
  }, [amount]);

  const submit = async () => {
    if (!isConnected) {
      toast.error("Connect wallet first");
      return;
    }

    if (asset !== "ETH") {
      toast.error("Only ETH staking is supported onchain right now");
      return;
    }

    if (!STAKING_ADDRESS) {
      toast.error("Missing staking contract address");
      return;
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    try {
      toast.loading("Confirm staking transaction in wallet...", {
        id: "stake",
      });
      writeContract({
        address: STAKING_ADDRESS,
        abi: stakingAbi,
        functionName: "stake",
        args: [parseEther(amount), BigInt(days)],
        value: parseEther(amount),
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit transaction", { id: "stake" });
    }
  };

  useEffect(() => {
    if (receipt.isSuccess) {
      toast.success("Stake confirmed", { id: "stake" });
      onSuccess?.();
      onClose();
    }
  }, [receipt.isSuccess, onClose, onSuccess]);

  useEffect(() => {
    if (receipt.isError) {
      toast.error("Stake transaction failed", { id: "stake" });
    }
  }, [receipt.isError]);

  if (!open) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box border border-base-300 bg-base-100">
        <h3 className="font-bold text-lg">Stake More</h3>
        <div className="mt-4 grid gap-4">
          <label className="form-control">
            <span className="label-text mb-2">Amount</span>
            <div className="join">
              <input
                className="input input-bordered join-item w-full"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
              <select
                className="select select-bordered join-item"
                value={asset}
                onChange={(event) => setAsset(event.target.value)}
              >
                <option>ETH</option>
                <option>USDC</option>
              </select>
            </div>
          </label>

          <label className="form-control">
            <span className="label-text mb-2">Lock period</span>
            <select
              className="select select-bordered"
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
            >
              {lockPeriods.map((period) => (
                <option key={period.days} value={period.days}>
                  {period.label}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm">
            Reputation multiplier preview:{" "}
            <strong>{multiplier.toFixed(2)}x</strong>
          </div>
        </div>

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={isPending || receipt.isLoading}
          >
            {isPending || receipt.isLoading ? "Submitting..." : "Stake"}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
