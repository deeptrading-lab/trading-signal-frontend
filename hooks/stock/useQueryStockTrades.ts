/**
 * 최근 체결(체결강도 + 체결 테이프) 훅 — 종목 상세·단타 워치 TradeStrengthPanel. `/api/stock/trades` BFF 경유.
 *
 * PRD `toss-trades` §3-5 (orderbook 쿼리 훅 `useQueryStockOrderbook` 과 동일 위치·형태):
 *   - 실패·빈 체결·토스 키 없음 전부 "빈 체결" 로 수렴 — BFF 가 fail-soft 200 이라 소비 측은 data 만 본다.
 *   - 폴링 주기는 **지면이 주입**(단타 3s·상세 10s). 정규장(②의 `isRegularOpen`)에만 갱신, 장외엔 재요청 없음.
 *   - 백그라운드 탭은 `refetchIntervalInBackground` 기본 false 로 자동 정지(비용·레이트 보호).
 *   - 폴링 게이팅은 orderbook 훅과 **동일 정책**(②의 `useMarketStatus().isRegularOpen`, 공휴일 인지·fail-open).
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getStockTrades } from "@/lib/api/stock/trades";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import { useMarketStatus } from "@/hooks/market/useMarketStatus";
import type { ApiError } from "@/lib/api/errors";
import type { TradesResult } from "@/lib/types/stock/trades";

export interface UseQueryStockTradesOptions {
  /** 지면이 렌더 조건을 판단(선택 종목 없으면 false). 기본 true(ticker 있을 때). */
  enabled?: boolean;
  /** 장중 폴링 간격(ms) — 단타 3000·상세 10000. 미지정이면 폴링 없음. */
  refetchIntervalMs?: number;
}

export function useQueryStockTrades(
  ticker: string,
  { enabled = true, refetchIntervalMs }: UseQueryStockTradesOptions = {},
): UseQueryResult<TradesResult, ApiError> {
  // orderbook 훅과 동일 정책 — 휴리스틱 → ②의 `isRegularOpen`(공휴일 인지, fail-open). PRD §3-3.
  const { isRegularOpen } = useMarketStatus();
  return useQuery({
    queryKey: queryKeys.stock.trades(ticker),
    queryFn: () => getStockTrades(ticker),
    staleTime: queryConfig.stock.trades.staleTime,
    gcTime: queryConfig.stock.trades.gcTime,
    enabled: enabled && ticker.length > 0,
    refetchInterval: () =>
      refetchIntervalMs != null && isRegularOpen ? refetchIntervalMs : false,
  });
}
