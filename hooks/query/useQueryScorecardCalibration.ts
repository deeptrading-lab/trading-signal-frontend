/**
 * confidence 버킷별 실측 보정값 조회 — TanStack Query useQuery.
 *
 * PRD `scorecard-feedback` §(가). queryKey = `queryKeys.scorecard.calibration`(인자 없는 단일 키).
 * staleTime / gcTime = `queryConfig.scorecard.calibration`. 채점 누적 통계라 변동 느림(폴링 없음).
 *
 * 컨벤션(frontend.md) — 본 페칭 훅(`hooks/query/`)은 도메인 훅에서만 호출한다(화면 직접 import 금지).
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchScorecardCalibration } from "@/lib/api/scorecard/calibration";
import type { ScorecardCalibrationResponse } from "@/lib/types/scorecard/scorecard";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";

export function useQueryScorecardCalibration(
  enabled = true,
): UseQueryResult<ScorecardCalibrationResponse, ApiError> {
  return useQuery<ScorecardCalibrationResponse, ApiError>({
    queryKey: queryKeys.scorecard.calibration,
    queryFn: () => fetchScorecardCalibration(),
    enabled,
    staleTime: queryConfig.scorecard.calibration.staleTime,
    gcTime: queryConfig.scorecard.calibration.gcTime,
    retry: 0,
    refetchOnWindowFocus: false,
  });
}
