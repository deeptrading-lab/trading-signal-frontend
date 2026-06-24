import { useMutationPatchPaperTradingSession } from "@/hooks/query/useMutationPatchPaperTradingSession";
import { useMutationRunPaperTradingTick } from "@/hooks/query/useMutationRunPaperTradingTick";
import { useQueryPaperTradingSession } from "@/hooks/query/useQueryPaperTradingSession";
import type { PaperTradingSessionStatus } from "@/lib/types/paperTrading/paperTrading";

export function usePaperTradingSession(sessionId: string) {
  const query = useQueryPaperTradingSession(sessionId);
  const runTickMutation = useMutationRunPaperTradingTick(sessionId);
  const patchMutation = useMutationPatchPaperTradingSession(sessionId);

  return {
    detail: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,
    isRunningTick: runTickMutation.isPending,
    isPatching: patchMutation.isPending,
    runTick: () => runTickMutation.mutateAsync({ triggeredBy: "user" }),
    setStatus: (status: Extract<PaperTradingSessionStatus, "running" | "paused" | "completed">) =>
      patchMutation.mutateAsync({ status }),
    refetch: query.refetch,
  };
}
