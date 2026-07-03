/**
 * 거래량/거래대금 순위 훅 — TanStack Query useQuery.
 *
 * 단타워치 후보 추천 + 홈 "실시간 랭킹" 탭(거래량순/거래대금순). queryKey/TTL 은 단일 진실 원천
 * (`queryKeys.market.volumeRank` / `queryConfig.market.volumeRank`). `by` 기본값 volume 은 무회귀.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getVolumeRank } from "@/lib/api/market/volumeRank";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";
import type {
  VolumeRankBy,
  VolumeRankResponse,
} from "@/lib/types/market/volumeRank";

export function useQueryVolumeRank(
  by: VolumeRankBy = "volume",
): UseQueryResult<VolumeRankResponse, ApiError> {
  return useQuery({
    queryKey: queryKeys.market.volumeRank(by),
    queryFn: () => getVolumeRank(by),
    staleTime: queryConfig.market.volumeRank.staleTime,
    gcTime: queryConfig.market.volumeRank.gcTime,
  });
}
