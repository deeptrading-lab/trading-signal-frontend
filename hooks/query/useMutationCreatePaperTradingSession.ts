import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPaperTradingSession } from "@/lib/api/paperTrading/sessions";
import { queryKeys } from "@/hooks/query/queryKeys";
import type { CreatePaperTradingSessionRequest } from "@/lib/types/paperTrading/paperTrading";

export function useMutationCreatePaperTradingSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePaperTradingSessionRequest) =>
      createPaperTradingSession(payload),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.paperTrading.sessions });
      queryClient.setQueryData(queryKeys.paperTrading.session(data.session.id), data);
    },
  });
}
