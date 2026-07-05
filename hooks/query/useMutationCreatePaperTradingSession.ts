import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPaperTradingSession } from "@/lib/api/paperTrading/sessions";
import { queryKeys } from "@/hooks/query/queryKeys";
import type { CreatePaperTradingSessionRequest } from "@/lib/types/paperTrading/paperTrading";

export function useMutationCreatePaperTradingSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePaperTradingSessionRequest) =>
      createPaperTradingSession(payload),
    // 실패는 화면 인라인 처리 — 전역 토스트 opt-out(중복 방지).
    meta: { skipGlobalErrorToast: true },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.paperTrading.sessions });
      queryClient.setQueryData(queryKeys.paperTrading.session(data.session.id), data);
    },
  });
}
