/**
 * 로컬 분석 워커 상태 폴링 — TanStack Query useQuery. (PRD analysis-request-queue 후속 S7)
 *
 * prod 처리 중 뱃지(`WorkerActivityBadge`)가 마운트된 동안만 worker-status 를 주기 폴링한다.
 * 언마운트(패널 닫힘)·탭 비활성 시 폴링은 자동 정지된다(v5 `refetchIntervalInBackground` 기본 false +
 * disabled 시 인터벌 일시정지). 실패는 흡수(retry 0)하고, 도메인 훅(`useWorkerActivity`)이
 * 에러/로딩 시 뱃지를 숨긴다(fail-soft — 카드 흐름을 막지 않는다).
 *
 * 컨벤션(frontend.md §2) — 본 페칭 훅은 도메인 훅에서만 호출한다(화면 직접 import 금지).
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchWorkerStatus } from "@/lib/api/stock/aiAnalysisQueue";
import { queryKeys } from "@/hooks/query/queryKeys";
import type { ApiError } from "@/lib/api/errors";
import type { WorkerStatusResponse } from "@/lib/types/stock/analysisQueue";

/** 워커 상태 폴링 간격(ms). 하트비트 갱신 주기(~20s)보다 촘촘해 idle↔busy 전이를 빠르게 잡는다. */
export const WORKER_STATUS_POLL_MS = 15_000;

export function useQueryWorkerStatus(
  enabled = true,
): UseQueryResult<WorkerStatusResponse, ApiError> {
  return useQuery<WorkerStatusResponse, ApiError>({
    queryKey: queryKeys.stock.workerStatus,
    queryFn: ({ signal }) => fetchWorkerStatus(signal),
    enabled,
    refetchInterval: WORKER_STATUS_POLL_MS,
    staleTime: 0,
    retry: 0,
    refetchOnWindowFocus: true,
  });
}
