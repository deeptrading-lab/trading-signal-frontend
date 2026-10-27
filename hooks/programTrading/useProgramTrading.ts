import { hasCandidates } from "@/lib/validation/programTrading/candidateGate";
import { useQueryProgramTrading, useMutationProgramTrading } from "@/hooks/query/useQueryProgramTrading";
import type { Command } from "@/lib/types/programTrading/programTrading";
export function useProgramTrading() {
 const query=useQueryProgramTrading(); const mutation=useMutationProgramTrading();
 return {canStart:!!query.data && hasCandidates(query.data.candidates),state:query.data,loading:query.isLoading,pending:mutation.isPending,error:query.data?.lastError??mutation.error?.message??query.error?.message,connected:!query.isError,send:(action:Command)=>mutation.mutate(action)};
}
