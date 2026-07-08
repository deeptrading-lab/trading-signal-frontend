/**
 * useTickLabels — 틱 자가채점 라벨 요약 + 라벨링 실행 도메인 훅. intraday-decision-overhaul PR-2.
 *
 * 캘리브레이션 패널(IntradayCalibrationPanel)이 쓰는 단일 진입점: 집계 조회(enabled 게이트 —
 * 패널 미노출 시 페치 없음) + 수동 실행(반복 클릭 백필, 멱등). 실행 성공 시 집계 자동 invalidate.
 * 실행 실패 피드백은 전역 mutation 안전망 토스트가 담당한다.
 */

"use client";

import { useMutationRunIntradayTickLabels } from "@/hooks/query/useMutationRunIntradayTickLabels";
import { useQueryIntradayTickLabelSummary } from "@/hooks/query/useQueryIntradayTickLabelSummary";

export function useTickLabels(enabled = true) {
  const query = useQueryIntradayTickLabelSummary(enabled);
  const runMutation = useMutationRunIntradayTickLabels();

  return {
    summary: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    /** 라벨링 실행 — 에러는 mutation 내부(전역 토스트)에서 처리되므로 unhandled rejection 없음. */
    run: () => runMutation.mutate({}),
    isRunning: runMutation.isPending,
    /** 마지막 실행 결과(성공 시) — 패널 인라인 결과 줄. */
    runResult: runMutation.data ?? null,
  };
}
