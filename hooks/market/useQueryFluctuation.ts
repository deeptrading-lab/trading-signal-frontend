/**
 * 등락률 순위(급상승/급하락) 훅 — TanStack Query useQuery.
 *
 * 홈 "실시간 랭킹" 탭용. queryKey/TTL 은 단일 진실 원천
 * (`queryKeys.market.fluctuation` / `queryConfig.market.fluctuation`). 방향별 분리 캐시.
 *
 * - enabled — 미지정 시 true. 실시간 랭킹은 4개 순위 훅을 항상 호출(rules of hooks)하되 활성 탭만
 *   `enabled` 로 켜, 마운트 시 KIS 랭킹 TR 을 한 번에 여러 개 발사하지 않는다(초당 한도 보호).
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getFluctuation } from "@/lib/api/market/fluctuation";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";
import type {
  FluctuationDirection,
  FluctuationResponse,
} from "@/lib/types/market/fluctuation";

export type UseQueryFluctuationOptions = {
  enabled?: boolean;
};

export function useQueryFluctuation(
  direction: FluctuationDirection = "up",
  options?: UseQueryFluctuationOptions,
): UseQueryResult<FluctuationResponse, ApiError> {
  return useQuery({
    queryKey: queryKeys.market.fluctuation(direction),
    queryFn: () => getFluctuation(direction),
    enabled: options?.enabled ?? true,
    staleTime: queryConfig.market.fluctuation.staleTime,
    gcTime: queryConfig.market.fluctuation.gcTime,
  });
}
