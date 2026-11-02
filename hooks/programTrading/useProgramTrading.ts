import { hasCandidates } from "@/lib/validation/programTrading/candidateGate";
import { useQueryProgramTrading, useMutationProgramTrading, useQueryProgramAccount, useMutationProgramAccount } from "@/hooks/query/useQueryProgramTrading";
import type { AccountInput, Command } from "@/lib/types/programTrading/programTrading";
export function useProgramTrading() {
 const accountQuery=useQueryProgramAccount(); const accountMutation=useMutationProgramAccount();
 const query=useQueryProgramTrading(); const mutation=useMutationProgramTrading();
 return {account:accountQuery.data,accountLoading:accountQuery.isLoading,accountPending:accountMutation.isPending,accountError:accountMutation.error?.message??accountQuery.error?.message,connectAccount:async(input:AccountInput)=>{await accountMutation.mutateAsync(input);},canStart:!!query.data && hasCandidates(query.data.candidates)&&!query.data.live?.startBlockReason,state:query.data,loading:query.isLoading,pending:mutation.isPending,error:query.data?.lastError??mutation.error?.message??query.error?.message,connected:!query.isError,send:(action:Command)=>mutation.mutate(action)};
}
