import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completePaperTradingPortfolio } from "@/lib/api/paperTrading/sessions";
import { queryKeys } from "@/hooks/query/queryKeys";

export function useMutationCompletePaperTradingPortfolio(sessionIds: string[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (portfolioId: string) => completePaperTradingPortfolio(portfolioId),
    meta: { skipGlobalErrorToast: true },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.paperTrading.sessions });
      for (const sessionId of sessionIds) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.paperTrading.session(sessionId) });
      }
    },
  });
}
