/**
 * CNN(미국) 공포·탐욕 지수 조회 훅 (TanStack Query useQuery).
 *
 * PRD `fear-greed-overhaul`.
 *
 * - queryKey = `queryKeys.market.fearGreed`(단일).
 * - staleTime / gcTime = `queryConfig.market.fearGreed`(30분 / 1시간) — 하루 단위 지표.
 * - retry 0 — BFF 가 실패 시 mock degrade 하므로 재시도 불필요.
 * - refetchOnWindowFocus false — 저빈도 지표.
 *
 * 응답 가공 불필요 — BFF 가 이미 `FearGreed` 화면 친화 스키마 반환.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  getCnnFearGreed,
  type CnnFearGreedResult,
} from "@/lib/api/market/fearGreed";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";

export function useQueryFearGreed(): UseQueryResult<
  CnnFearGreedResult,
  ApiError
> {
  return useQuery<CnnFearGreedResult, ApiError>({
    queryKey: queryKeys.market.fearGreed,
    queryFn: () => getCnnFearGreed(),
    staleTime: queryConfig.market.fearGreed.staleTime,
    gcTime: queryConfig.market.fearGreed.gcTime,
    retry: 0,
    refetchOnWindowFocus: false,
  });
}
