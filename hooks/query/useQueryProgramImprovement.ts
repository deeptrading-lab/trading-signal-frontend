import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getImprovementJob, requestImprovement } from "@/lib/api/programTrading/improvement";
import { queryKeys } from "./queryKeys";

export function useQueryProgramImprovement() {
  return useQuery({ queryKey: queryKeys.programImprovement, queryFn: getImprovementJob, refetchInterval: 3_000, retry: false });
}

export function useMutationProgramImprovement() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: requestImprovement,
    onSuccess: job => client.setQueryData(queryKeys.programImprovement, job),
  });
}
