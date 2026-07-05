import { useMutationPatchPaperTradingSession } from "@/hooks/query/useMutationPatchPaperTradingSession";
import { useMutationRunPaperTradingTick } from "@/hooks/query/useMutationRunPaperTradingTick";
import { useQueryPaperTradingSession } from "@/hooks/query/useQueryPaperTradingSession";
import { useToast } from "@/hooks/utils/useToast";
import {
  PAPER_STATUS_CHANGE_ERROR,
  PAPER_TICK_ERROR,
} from "@/lib/copy/paperTrading/labels";
import type { PaperTradingSessionStatus } from "@/lib/types/paperTrading/paperTrading";

export function usePaperTradingSession(sessionId: string) {
  const toast = useToast();
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
    // 호출부는 fire-and-forget(성공 후속 로직 없음) — 실패 토스트 + rejection 삼킴(unhandled 방지).
    runTick: () =>
      runTickMutation
        .mutateAsync({ triggeredBy: "user" })
        .catch(() => toast.error(PAPER_TICK_ERROR)),
    setStatus: (status: Extract<PaperTradingSessionStatus, "running" | "paused" | "completed">) =>
      patchMutation
        .mutateAsync({ status })
        .catch(() => toast.error(PAPER_STATUS_CHANGE_ERROR)),
    refetch: query.refetch,
  };
}
