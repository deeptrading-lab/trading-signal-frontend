import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProgramState, sendProgramCommand } from "@/lib/api/programTrading/programTrading";
import { queryKeys } from "@/hooks/query/queryKeys";
export function useQueryProgramTrading() { return useQuery({queryKey:queryKeys.programTrading,queryFn:getProgramState,refetchInterval:2000,retry:false}); }
export function useMutationProgramTrading() { const client=useQueryClient(); return useMutation({mutationFn:sendProgramCommand,onSuccess:data=>{client.setQueryData(queryKeys.programTrading,data);}}); }
