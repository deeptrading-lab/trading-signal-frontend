import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProgramAssets, updateProgramAssets } from "@/lib/api/programTrading/assets";
import { queryKeys } from "./queryKeys";

export function useQueryProgramAssets() {
  return useQuery({ queryKey: queryKeys.programAssets, queryFn: ({ signal }) => getProgramAssets(signal), staleTime: 0, retry: false });
}
export function useMutationProgramAssets() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: updateProgramAssets,
    onSuccess: data => { client.setQueryData(queryKeys.programAssets, data); },
  });
}
