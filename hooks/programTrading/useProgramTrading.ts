import { hasCandidates } from "@/lib/validation/programTrading/candidateGate";
import { useMutationProgramTrading, useQueryProgramTrading } from "@/hooks/query/useQueryProgramTrading";
import type { Command } from "@/lib/types/programTrading/programTrading";

export function useProgramTrading() {
  const query = useQueryProgramTrading();
  const mutation = useMutationProgramTrading();
  const state = query.data;
  return {
    state,
    loading: query.isLoading,
    pending: mutation.isPending,
    connected: !query.isError,
    canStart: !!state && hasCandidates(state.candidates) && !state.startBlockReason,
    error: state?.lastError ?? mutation.error?.message ?? query.error?.message,
    send: (action: Command) => mutation.mutate(action),
  };
}
