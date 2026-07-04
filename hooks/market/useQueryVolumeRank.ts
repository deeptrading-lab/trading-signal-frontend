/**
 * 거래량/거래대금 순위 훅 — TanStack Query useQuery.
 *
 * 단타워치 후보 추천 + 홈 "실시간 랭킹" 탭(거래량순/거래대금순). queryKey/TTL 은 단일 진실 원천
 * (`queryKeys.market.volumeRank` / `queryConfig.market.volumeRank`). `by` 기본값 volume 은 무회귀.
 *
 * - enabled — 미지정 시 true(무회귀). 실시간 랭킹은 4개 순위 훅을 항상 호출(rules of hooks)하되
 *   활성 탭만 `enabled` 로 켜, 마운트 시 KIS 랭킹 TR 을 한 번에 여러 개 발사하지 않는다(초당 한도 보호).
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

export type UseQueryVolumeRankOptions = {
  enabled?: boolean;
};

export function useQueryVolumeRank(
  by: VolumeRankBy = "volume",
  options?: UseQueryVolumeRankOptions,
): UseQueryResult<VolumeRankResponse, ApiError> {
  return useQuery({
    queryKey: queryKeys.market.volumeRank(by),
    queryFn: () => getVolumeRank(by),
    enabled: options?.enabled ?? true,
    staleTime: queryConfig.market.volumeRank.staleTime,
    gcTime: queryConfig.market.volumeRank.gcTime,
  });
}
