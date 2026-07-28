import { useMutation, useQueryClient } from "@tanstack/react-query";
import { stopAutopilotRun } from "@/lib/api/paperTrading/autopilot";
import { queryKeys } from "@/hooks/query/queryKeys";

export function useMutationStopAutopilotRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      runId,
      completeChildSessions,
    }: {
      runId: string;
      completeChildSessions?: boolean;
    }) => stopAutopilotRun(runId, { completeChildSessions }),
    // 실패는 카드 인라인 처리 — 전역 토스트 opt-out(중복 방지).
    meta: { skipGlobalErrorToast: true },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.paperTrading.autopilot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.paperTrading.sessions }),
      ]);
    },
  });
}
