/**
 * 틱 라벨링 실행 mutation — intraday-decision-overhaul PR-2.
 *
 * `POST /api/intraday/labels/run`(완료 세션 최대 N개 채점) 후 라벨 집계 키를 invalidate 해
 * 캘리브레이션 패널 표가 즉시 갱신되게 한다. 실패 피드백은 전역 mutation 안전망 토스트에 위임
 * (자체 처리 없음 — opt-out 하지 않는다).
 */

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { runIntradayTickLabels } from "@/lib/api/intraday/labels";
import { queryKeys } from "@/hooks/query/queryKeys";
import type { RunIntradayTickLabelsRequest } from "@/lib/types/intraday/tickLabels";

export function useMutationRunIntradayTickLabels() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RunIntradayTickLabelsRequest = {}) => runIntradayTickLabels(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.intraday.tickLabelSummary });
    },
  });
}
