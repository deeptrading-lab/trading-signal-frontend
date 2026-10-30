import type { CandidateSnapshot } from "@/lib/types/programTrading/programTrading";

/** External ranking IO stays outside the trading queue; only snapshot application is serialized. */
export function createCandidateRefresh(
  load: () => Promise<CandidateSnapshot>,
  apply: (snapshot: CandidateSnapshot) => Promise<void>,
) {
  let pending: Promise<void> | null = null;
  return function refresh(): Promise<void> {
    if (pending) return pending;
    pending = Promise.resolve().then(load).then(apply).finally(() => { pending = null; });
    return pending;
  };
}
