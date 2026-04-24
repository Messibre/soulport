import { FormEvent, useState } from "react";
import toast from "react-hot-toast";

import { ApiErrorBox } from "./ApiErrorBox";
import {
  getApiErrorDisplay,
  getMatches,
  type ApiErrorDisplay,
} from "../lib/api";

type Match = {
  address: string;
  score: number;
  title: string;
};

const demoMatches: Match[] = [
  { address: "0x1111...1111", score: 94, title: "DeFi Product Engineer" },
  { address: "0x2222...2222", score: 89, title: "Smart Contract Auditor" },
  { address: "0x3333...3333", score: 83, title: "Growth + Onchain Analyst" },
];

export function MatchmakerCard() {
  const [jobTitle, setJobTitle] = useState("");
  const [description, setDescription] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState<ApiErrorDisplay | null>(null);

  const runMatchRequest = async () => {
    setErrorState(null);
    setLoading(true);
    try {
      const response = await getMatches(`${jobTitle}\n\n${description}`);
      const normalized = response.matches.map((match) => ({
        address: match.address,
        score: match.score,
        title: match.title || "Matched Freelancer",
      }));
      setMatches(normalized.length > 0 ? normalized : demoMatches);
      toast.success("Top matches generated");
    } catch (error) {
      console.error(error);
      const displayError = getApiErrorDisplay(error);
      setMatches(demoMatches);
      setErrorState(displayError);
      toast.error("Showing demo matches while backend is unavailable");
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await runMatchRequest();
  };

  return (
    <section className="card border border-base-300 bg-base-200/70">
      <div className="card-body">
        <h2 className="card-title">AI Smart Matchmaker</h2>
        <form className="grid gap-3" onSubmit={submit}>
          <input
            className="input input-bordered"
            placeholder="Job title"
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
            required
          />
          <textarea
            className="textarea textarea-bordered min-h-28"
            placeholder="Job description and required skills"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
          />
          <button
            className="btn btn-primary w-fit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Finding matches..." : "Find Top Matches"}
          </button>
        </form>

        {errorState && (
          <ApiErrorBox
            title="Match generation failed"
            message={errorState.message}
            requestId={errorState.requestId}
            hint={errorState.hint}
            onRetry={
              errorState.canRetry ? () => void runMatchRequest() : undefined
            }
            retryDisabled={loading}
            retryLabel={loading ? "Retrying..." : "Retry matching"}
          />
        )}

        {matches.length > 0 && (
          <div className="mt-3 grid gap-2">
            {matches.map((match) => (
              <article
                key={match.address}
                className="rounded-lg border border-base-300 bg-base-100 p-3 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="font-semibold">{match.title}</p>
                  <p className="text-xs opacity-70">{match.address}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge badge-primary">
                    Score {match.score}
                  </span>
                  <button className="btn btn-sm btn-outline">Hire</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
