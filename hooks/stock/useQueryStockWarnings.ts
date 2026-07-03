/**
 * 매수 유의사항(거래소 시장경보·VI) 훅 — 종목 헤더 경고 칩. `/api/stock/warnings` BFF 경유.
 *
 * PRD `stock-warnings` §3-3:
 *   - 실패·빈 배열·토스 키 없음 전부 "칩 미표시" 로 수렴 — 헤더 렌더를 절대 막지 않는다.
 *     (BFF 가 fail-soft 200 이라 isError 는 사실상 네트워크 단절뿐 — 소비 측은 data 만 본다.)
 *   - VI(실시간 계열) 추적: 장중(+마감 유예)에만 60초 간격 자동 갱신, 장외엔 재요청 없음
 *     (`useQueryMinuteChart` 와 동일 패턴).
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getStockWarnings } from "@/lib/api/stock/warnings";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import { isKstMarketHoursWithCloseGrace } from "@/lib/utils/kstMarketHours";
import type { ApiError } from "@/lib/api/errors";
import type { StockWarningsResponse } from "@/lib/types/stock/warnings";

export function useQueryStockWarnings(
  ticker: string,
): UseQueryResult<StockWarningsResponse, ApiError> {
  return useQuery({
    queryKey: queryKeys.stock.warnings(ticker),
    queryFn: () => getStockWarnings(ticker),
    staleTime: queryConfig.stock.warnings.staleTime,
    gcTime: queryConfig.stock.warnings.gcTime,
    enabled: ticker.length > 0,
    refetchInterval: () => (isKstMarketHoursWithCloseGrace() ? 60_000 : false),
  });
}
