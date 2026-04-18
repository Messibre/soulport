import { useState } from "react";

import { ImportWizardModal } from "../components/ImportWizardModal";

export function ImportPage() {
  const [open, setOpen] = useState(true);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="card border border-base-300 bg-base-200/70 shadow-aurora">
        <div className="card-body">
          <h1 className="card-title text-2xl">Web2 Import Wizard</h1>
          <p className="opacity-80">
            Import LinkedIn, GitHub, Coursera, and more through Reclaim ZK
            proofs, then mint your data as Soulbound credentials.
          </p>
          <button
            className="btn btn-primary w-fit"
            onClick={() => setOpen(true)}
          >
            Start import flow
          </button>
        </div>
      </div>

      <ImportWizardModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
