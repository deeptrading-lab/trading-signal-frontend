import { useMutation, useQueryClient } from "@tanstack/react-query";
import { stopAutopilotRun } from "@/lib/api/paperTrading/autopilot";
import { queryKeys } from "@/hooks/query/queryKeys";

export function useMutationStopAutopilotRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => stopAutopilotRun(runId),
    // 실패는 카드 인라인 처리 — 전역 토스트 opt-out(중복 방지).
    meta: { skipGlobalErrorToast: true },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.paperTrading.autopilot });
    },
  });
}
