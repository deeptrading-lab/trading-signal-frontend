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
import { getFluctuation, type FluctuationResult } from "@/lib/api/market/fluctuation";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";
import type { DataSource } from "@/lib/types/market/dataSource";
import type {
  FluctuationDirection,
  FluctuationResponse,
} from "@/lib/types/market/fluctuation";

export type UseQueryFluctuationOptions = {
  enabled?: boolean;
};

/**
 * useQuery 결과에서 `data` 를 화면 데이터로 되돌리고 `dataSource`(표면화된 출처)를 함께 노출한다.
 * fluctuation 은 never-throw 라 `dataSource`(mock-empty/mock-error/mock-timeout)가 점검 판정의 유일 근거(§6).
 */
export type UseQueryFluctuationResult = Omit<
  UseQueryResult<FluctuationResult, ApiError>,
  "data"
> & {
  data: FluctuationResponse | undefined;
  /** 표면화된 `X-Data-Source` — 가용성 판정 근거(§3-0). */
  dataSource: DataSource | undefined;
};

export function useQueryFluctuation(
  direction: FluctuationDirection = "up",
  options?: UseQueryFluctuationOptions,
): UseQueryFluctuationResult {
  const query = useQuery<FluctuationResult, ApiError>({
    queryKey: queryKeys.market.fluctuation(direction),
    queryFn: () => getFluctuation(direction),
    enabled: options?.enabled ?? true,
    staleTime: queryConfig.market.fluctuation.staleTime,
    gcTime: queryConfig.market.fluctuation.gcTime,
  });
  return {
    ...query,
    data: query.data?.data,
    dataSource: query.data?.dataSource,
  } as UseQueryFluctuationResult;
}
