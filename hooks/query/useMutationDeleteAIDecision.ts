import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAIAnalysisDecision } from "@/lib/api/stock/aiAnalysisDecisions";
import { queryKeys } from "@/hooks/query/queryKeys";

/**
 * 저장 분석 결과 삭제(superadmin 전용) — 성공 시 목록/해당 종목 캐시 무효화해 카드가 즉시 사라진다.
 * 실패는 전역 mutation 토스트가 처리(자체 opt-out 안 함).
 */
export function useMutationDeleteAIDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ticker: string) => deleteAIAnalysisDecision(ticker),
    onSuccess: async (_data, ticker) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.stock.aiDecisions });
      queryClient.invalidateQueries({ queryKey: queryKeys.stock.aiDecision(ticker) });
    },
  });
}
