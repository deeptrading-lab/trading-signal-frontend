/**
 * 업종 등락 랭킹("지금 뜨는 산업") 훅 — TanStack Query useQuery.
 *
 * queryKey/TTL 은 단일 진실 원천(`queryKeys.market.sectorRanking` / `queryConfig.market.sectorRanking`).
 * 가용성 판정(§3-6)을 위해 `dataSource`(표면화된 `X-Data-Source`)를 함께 노출한다.
 *
 * 컴포넌트는 본 도메인 훅만 소비한다(`useQuery` 직접 import 금지 — `docs/rules/frontend.md` §1·§2).
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  getSectorRanking,
  type SectorRankingResult,
} from "@/lib/api/market/sectors";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";
import type { DataSource } from "@/lib/types/market/dataSource";
import type { SectorRankingResponse } from "@/lib/types/market/sectors";

export type UseQuerySectorRankingResult = Omit<
  UseQueryResult<SectorRankingResult, ApiError>,
  "data"
> & {
  data: SectorRankingResponse | undefined;
  /** 표면화된 `X-Data-Source` — 가용성 판정 근거. */
  dataSource: DataSource | undefined;
};

export function useQuerySectorRanking(): UseQuerySectorRankingResult {
  const query = useQuery<SectorRankingResult, ApiError>({
    queryKey: queryKeys.market.sectorRanking,
    queryFn: () => getSectorRanking(),
    staleTime: queryConfig.market.sectorRanking.staleTime,
    gcTime: queryConfig.market.sectorRanking.gcTime,
  });
  return {
    ...query,
    data: query.data?.data,
    dataSource: query.data?.dataSource,
  } as UseQuerySectorRankingResult;
}
