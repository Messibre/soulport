import { useEffect, useState } from "react";
import { EAS } from "@ethereum-attestation-service/eas-sdk";
import { JsonRpcProvider } from "ethers";

type AttestationItem = {
  uid: string;
  schema: string;
  attester: string;
  time: string;
};

type AttestationViewerProps = {
  address?: string;
};

export function AttestationViewer({ address }: AttestationViewerProps) {
  const [items, setItems] = useState<AttestationItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!address) {
        setItems([]);
        return;
      }

      const contractAddress = process.env.REACT_APP_EAS_CONTRACT_ADDRESS;
      const rpcUrl = process.env.REACT_APP_BASE_SEPOLIA_RPC_URL;
      const uidCsv = process.env.REACT_APP_EAS_UIDS || "";
      const uids = uidCsv
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (!contractAddress || !rpcUrl || uids.length === 0) {
        setItems([
          {
            uid: "demo-attestation-uid-1",
            schema: "Skill Schema",
            attester: "0xAttesterDemo",
            time: new Date().toISOString(),
          },
        ]);
        return;
      }

      setLoading(true);
      try {
        const provider = new JsonRpcProvider(rpcUrl);
        const eas = new EAS(contractAddress);
        eas.connect(provider);

        const entries = await Promise.all(
          uids.map(async (uid) => {
            const attestation = await eas.getAttestation(uid);
            return {
              uid,
              schema: attestation.schema,
              attester: attestation.attester,
              time: new Date(Number(attestation.time) * 1000).toISOString(),
            };
          }),
        );

        if (!cancelled) {
          setItems(entries);
        }
      } catch (error) {
        console.error("Unable to fetch attestations", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [address]);

  return (
    <section className="card border border-base-300 bg-base-200/70">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <h2 className="card-title">EAS Attestations</h2>
          <a
            className="link text-sm"
            href="https://base-sepolia.easscan.org"
            target="_blank"
            rel="noreferrer"
          >
            Open EAS Explorer
          </a>
        </div>

        {loading && <span className="loading loading-dots loading-md" />}

        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.uid}
              className="rounded-lg border border-base-300 bg-base-100 p-3"
            >
              <p className="text-xs opacity-70">UID: {item.uid}</p>
              <p className="font-semibold">{item.schema}</p>
              <p className="text-sm opacity-80">Attester: {item.attester}</p>
              <p className="text-xs opacity-65">
                {new Date(item.time).toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
