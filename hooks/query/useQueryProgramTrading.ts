import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProgramState, sendProgramCommand } from "@/lib/api/programTrading/programTrading";
import { queryKeys } from "@/hooks/query/queryKeys";

const ACTIVE_REFRESH_MS = 5_000;
const IDLE_REFRESH_MS = 30_000;

export function useQueryProgramTrading() {
  return useQuery({
    queryKey: queryKeys.programTrading,
    queryFn: ({ signal }) => getProgramState(signal),
    refetchInterval: ({ state: { data } }) =>
      data && (data.running || data.positions.length || data.lifecycle?.status === "stopping")
        ? ACTIVE_REFRESH_MS
        : IDLE_REFRESH_MS,
    retry: false,
  });
}

export function useMutationProgramTrading() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: sendProgramCommand,
    onSuccess: async data => {
      // Discard any snapshot that was requested before the command was applied.
      await client.cancelQueries({ queryKey: queryKeys.programTrading, exact: true });
      client.setQueryData(queryKeys.programTrading, data);
    },
  });
}
