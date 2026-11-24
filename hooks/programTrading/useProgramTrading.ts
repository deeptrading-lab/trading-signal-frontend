import { useMutationProgramTrading, useQueryProgramTrading } from "@/hooks/query/useQueryProgramTrading";
import type { ProgramTradingAction } from "@/lib/types/programTrading/programTrading";

export function useProgramTrading() {
  const query = useQueryProgramTrading();
  const mutation = useMutationProgramTrading();
  const state = query.data;
  return {
    state,
    loading: query.isLoading,
    pending: mutation.isPending,
    connected: !query.isError,
    canStart: !!state && !state.startBlockReason,
    error: state?.lastError ?? mutation.error?.message ?? query.error?.message,
    send: (action: ProgramTradingAction) => mutation.mutate(action),
  };
}
