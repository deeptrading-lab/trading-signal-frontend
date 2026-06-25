import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patchPaperTradingSession } from "@/lib/api/paperTrading/sessions";
import { queryKeys } from "@/hooks/query/queryKeys";
import type { PatchPaperTradingSessionRequest } from "@/lib/types/paperTrading/paperTrading";

export function useMutationPatchPaperTradingSession(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PatchPaperTradingSessionRequest) =>
      patchPaperTradingSession(sessionId, payload),
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.paperTrading.session(sessionId), data);
      await queryClient.invalidateQueries({ queryKey: queryKeys.paperTrading.sessions });
    },
  });
}
