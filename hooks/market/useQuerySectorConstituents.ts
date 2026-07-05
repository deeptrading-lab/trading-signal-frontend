/**
 * 업종 구성종목 훅 — TanStack Query useQuery. **모달 열릴 때만** `enabled`(불필요 조회 억제).
 *
 * queryKey/TTL 은 단일 진실 원천(`queryKeys.market.sectorConstituents` / `queryConfig.market.sectorConstituents`).
 * 가용성 판정을 위해 `dataSource` 를 함께 노출한다. 컴포넌트는 본 도메인 훅만 소비(useQuery 직접 import 금지).
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  getSectorConstituents,
  type SectorConstituentsResult,
} from "@/lib/api/market/sectors";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";
import type { DataSource } from "@/lib/types/market/dataSource";
import type { SectorConstituentsResponse } from "@/lib/types/market/sectors";

export type UseQuerySectorConstituentsOptions = {
  /** 모달 열림 여부 — 열릴 때만 조회. */
  enabled?: boolean;
};

export type UseQuerySectorConstituentsResult = Omit<
  UseQueryResult<SectorConstituentsResult, ApiError>,
  "data"
> & {
  data: SectorConstituentsResponse | undefined;
  dataSource: DataSource | undefined;
};

export function useQuerySectorConstituents(
  code: string | null,
  options?: UseQuerySectorConstituentsOptions,
): UseQuerySectorConstituentsResult {
  const query = useQuery<SectorConstituentsResult, ApiError>({
    queryKey: queryKeys.market.sectorConstituents(code ?? ""),
    queryFn: () => getSectorConstituents(code as string),
    enabled: (options?.enabled ?? true) && !!code,
    staleTime: queryConfig.market.sectorConstituents.staleTime,
    gcTime: queryConfig.market.sectorConstituents.gcTime,
  });
  return {
    ...query,
    data: query.data?.data,
    dataSource: query.data?.dataSource,
  } as UseQuerySectorConstituentsResult;
}
