import { useMutationCreatePaperTradingSession } from "@/hooks/query/useMutationCreatePaperTradingSession";
import { useQueryPaperTradingSessions } from "@/hooks/query/useQueryPaperTradingSessions";
import type { CreatePaperTradingSessionRequest } from "@/lib/types/paperTrading/paperTrading";

export function usePaperTradingSessions() {
  const query = useQueryPaperTradingSessions();
  const createMutation = useMutationCreatePaperTradingSession();

  return {
    sessions: query.data?.sessions ?? [],
    /** 이 응답을 서빙한 서버 운영자 — "내 세션" 배지·필터 판정용. 구 응답/미로드면 undefined. */
    currentOperator: query.data?.currentOperator,
    isLoading: query.isLoading,
    isError: query.isError,
    isCreating: createMutation.isPending,
    create: (payload: CreatePaperTradingSessionRequest) => createMutation.mutateAsync(payload),
    refetch: query.refetch,
  };
}
