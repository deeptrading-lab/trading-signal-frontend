/**
 * 호가창(매수/매도 잔량) 훅 — 종목 상세·단타 워치 OrderbookPanel. `/api/stock/orderbook` BFF 경유.
 *
 * PRD `toss-orderbook` §3-4:
 *   - 실패·빈 호가·토스 키 없음 전부 "빈 호가" 로 수렴 — BFF 가 fail-soft 200 이라 소비 측은 data 만 본다.
 *   - 폴링 주기는 **지면이 주입**(단타 3s·상세 10s, §9 q3). 장중(+마감 유예)에만 갱신, 장외엔 재요청 없음.
 *   - 백그라운드 탭은 `refetchIntervalInBackground` 기본 false 로 자동 정지(비용·레이트 보호).
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getStockOrderbook } from "@/lib/api/stock/orderbook";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import { isKstMarketHoursWithCloseGrace } from "@/lib/utils/kstMarketHours";
import type { ApiError } from "@/lib/api/errors";
import type { StockOrderbookResponse } from "@/lib/types/stock/orderbook";

export interface UseQueryStockOrderbookOptions {
  /** 지면이 렌더 조건을 판단(선택 종목 없으면 false). 기본 true(ticker 있을 때). */
  enabled?: boolean;
  /** 장중 폴링 간격(ms) — 단타 3000·상세 10000. 미지정이면 폴링 없음. */
  refetchIntervalMs?: number;
}

export function useQueryStockOrderbook(
  ticker: string,
  { enabled = true, refetchIntervalMs }: UseQueryStockOrderbookOptions = {},
): UseQueryResult<StockOrderbookResponse, ApiError> {
  return useQuery({
    queryKey: queryKeys.stock.orderbook(ticker),
    queryFn: () => getStockOrderbook(ticker),
    staleTime: queryConfig.stock.orderbook.staleTime,
    gcTime: queryConfig.stock.orderbook.gcTime,
    enabled: enabled && ticker.length > 0,
    refetchInterval: () =>
      refetchIntervalMs != null && isKstMarketHoursWithCloseGrace()
        ? refetchIntervalMs
        : false,
  });
}
