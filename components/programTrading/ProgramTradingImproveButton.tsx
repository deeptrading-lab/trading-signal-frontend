"use client";

import { useProgramImprovement } from "@/hooks/programTrading/useProgramImprovement";
import { PROGRAM_REVIEW_COPY as C } from "@/lib/copy/programTrading/programTrading";

export function ProgramTradingImproveButton({ sessionId, evaluationId, applied }: {
  sessionId: string;
  evaluationId?: string;
  applied: boolean;
}) {
  const { ownJob, busy, completed, pending, error, start } = useProgramImprovement(sessionId, evaluationId, applied);
  const retry = ownJob?.stage === "history-pending";
  const status = ownJob?.stage === "preparing" ? C.improvePreparing
    : ownJob?.stage === "verifying" ? C.improveVerifying
    : completed ? C.improveCompleted
    : ownJob?.message ?? (busy ? C.improveBusy : applied ? C.improveApplied : undefined);

  return (
    <div className="space-y-xs">
      <button type="button" className="button-secondary program-trading-action w-full sm:w-auto"
        disabled={!evaluationId || pending || busy || completed || (applied && !retry)} onClick={start}>
        {retry ? C.improveRetry : C.improve}
      </button>
      <p className="text-caption text-text-muted">{C.improveHint}</p>
      {(error || status) && <p role="status" className="break-keep text-body-sm text-text-strong">{error ?? status}</p>}
    </div>
  );
}
