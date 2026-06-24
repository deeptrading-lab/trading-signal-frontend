import { useMutationCreatePaperTradingSession } from "@/hooks/query/useMutationCreatePaperTradingSession";
import { useQueryPaperTradingSessions } from "@/hooks/query/useQueryPaperTradingSessions";
import type { CreatePaperTradingSessionRequest } from "@/lib/types/paperTrading/paperTrading";

export function usePaperTradingSessions() {
  const query = useQueryPaperTradingSessions();
  const createMutation = useMutationCreatePaperTradingSession();

  return {
    sessions: query.data?.sessions ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    isCreating: createMutation.isPending,
    create: (payload: CreatePaperTradingSessionRequest) => createMutation.mutateAsync(payload),
    refetch: query.refetch,
  };
}
