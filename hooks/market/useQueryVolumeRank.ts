/**
 * 거래량 순위 훅 — TanStack Query useQuery.
 *
 * 단타워치 후보 추천(수급 Top10 과 병렬 노출). queryKey/TTL 은 단일 진실 원천
 * (`queryKeys.market.volumeRank` / `queryConfig.market.volumeRank`).
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getVolumeRank } from "@/lib/api/market/volumeRank";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";
import type { VolumeRankResponse } from "@/lib/types/market/volumeRank";

export function useQueryVolumeRank(): UseQueryResult<VolumeRankResponse, ApiError> {
  return useQuery({
    queryKey: queryKeys.market.volumeRank,
    queryFn: getVolumeRank,
    staleTime: queryConfig.market.volumeRank.staleTime,
    gcTime: queryConfig.market.volumeRank.gcTime,
  });
}
