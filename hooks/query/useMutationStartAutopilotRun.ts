import { useMutation, useQueryClient } from "@tanstack/react-query";
import { startAutopilotRun } from "@/lib/api/paperTrading/autopilot";
import { queryKeys } from "@/hooks/query/queryKeys";
import type { StartAutopilotRunRequest } from "@/lib/types/paperTrading/autopilot";

export function useMutationStartAutopilotRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StartAutopilotRunRequest) => startAutopilotRun(payload),
    // 실패는 카드 인라인 처리 — 전역 토스트 opt-out(중복 방지, 세션 생성 관례).
    meta: { skipGlobalErrorToast: true },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.paperTrading.autopilot, data);
    },
  });
}
