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
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.paperTrading.autopilot, data);
      // 중지(useMutationStopAutopilotRun)와 대칭 — 멱등 재시작이면 기존 자식 세션이 이미 있어 즉시
      // 반영된다. ⚠️ 이건 정합성 보정이지 "시작 직후 세션이 안 보임" 의 해결책이 아니다: 자식 세션은
      // 서버 스윕이 나중에 만들어서 mutation 시점엔 존재하지 않는다 — 지속 발견은
      // useQueryPaperTradingSessions 의 refetchInterval 이 담당한다.
      await queryClient.invalidateQueries({ queryKey: queryKeys.paperTrading.sessions });
    },
  });
}
