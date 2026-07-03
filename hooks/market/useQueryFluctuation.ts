/**
 * 등락률 순위(급상승/급하락) 훅 — TanStack Query useQuery.
 *
 * 홈 "실시간 랭킹" 탭용. queryKey/TTL 은 단일 진실 원천
 * (`queryKeys.market.fluctuation` / `queryConfig.market.fluctuation`). 방향별 분리 캐시.
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

export function useQueryFluctuation(
  direction: FluctuationDirection = "up",
): UseQueryResult<FluctuationResponse, ApiError> {
  return useQuery({
    queryKey: queryKeys.market.fluctuation(direction),
    queryFn: () => getFluctuation(direction),
    staleTime: queryConfig.market.fluctuation.staleTime,
    gcTime: queryConfig.market.fluctuation.gcTime,
  });
}
