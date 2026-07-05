import { useMutation, useQueryClient } from "@tanstack/react-query";
import { runPaperTradingTick } from "@/lib/api/paperTrading/sessions";
import { queryKeys } from "@/hooks/query/queryKeys";
import type { RunPaperTradingTickRequest } from "@/lib/types/paperTrading/paperTrading";

export function useMutationRunPaperTradingTick(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RunPaperTradingTickRequest = {}) =>
      runPaperTradingTick(sessionId, payload),
    // 실패는 usePaperTradingSession 의 .catch 토스트로 처리 — 전역 토스트 opt-out(중복 방지).
    meta: { skipGlobalErrorToast: true },
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.paperTrading.session(sessionId), data);
      await queryClient.invalidateQueries({ queryKey: queryKeys.paperTrading.sessions });
    },
  });
}
