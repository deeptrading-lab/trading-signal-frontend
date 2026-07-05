/**
 * 스파크라인 배치 훅 — 구성종목 티커 집합의 최근 종가 시리즈를 **한 번의 요청**으로.
 *
 * 모달 차트 열을 행마다 개별 차트 API 로 그리는 대신, 이 배치 하나로 전 종목을 받아 **일괄** 렌더한다
 * (빈 네모·순차 없음). queryKey/TTL 단일 출처(`queryKeys.market.sparklines`/`queryConfig.stock.daily` —
 * 일봉 종가라 일봉과 동일 주기). 티커가 있을 때만 `enabled`. 실패해도 모달은 스파크라인 없이 렌더.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getSparklines } from "@/lib/api/market/sectors";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";
import type { SectorSparklinesResponse } from "@/lib/types/market/sectors";

export function useQuerySectorSparklines(
  tickers: string[],
): UseQueryResult<SectorSparklinesResponse, ApiError> {
  return useQuery<SectorSparklinesResponse, ApiError>({
    queryKey: queryKeys.market.sparklines(tickers),
    queryFn: () => getSparklines(tickers),
    enabled: tickers.length > 0,
    staleTime: queryConfig.stock.daily.staleTime,
    gcTime: queryConfig.stock.daily.gcTime,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
