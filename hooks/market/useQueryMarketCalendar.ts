/**
 * 국내 장 캘린더 조회 훅 — TanStack Query useQuery.
 *
 * PRD `toss-market-calendar` §3-6 — `useMarketStatus` 도메인 훅이 소비. `useQuery` 직접 import 금지.
 *
 * - queryKey = `queryKeys.market.calendar`(인자 없음).
 * - queryFn = `getMarketCalendar`(same-origin `/api/market/calendar`).
 * - staleTime / gcTime = `queryConfig.market.calendar`(단일 진실 원천, 캘린더 정적 → 길게).
 * - 폴링 없음(정적). phase 시간 경과 갱신은 `useMarketStatus` 의 클라 재평가가 담당(네트워크 콜 0).
 *
 * BFF 가 never-throw(키 없음·실패도 200 + phase="unknown")라 본 훅은 에러보다 data 를 우선 소비한다.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getMarketCalendar } from "@/lib/api/market/calendar";
import type { MarketCalendarResponse } from "@/lib/types/market/marketStatus";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";

export function useQueryMarketCalendar(): UseQueryResult<
  MarketCalendarResponse,
  ApiError
> {
  return useQuery<MarketCalendarResponse, ApiError>({
    queryKey: queryKeys.market.calendar,
    queryFn: getMarketCalendar,
    staleTime: queryConfig.market.calendar.staleTime,
    gcTime: queryConfig.market.calendar.gcTime,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
