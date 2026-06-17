/**
 * 복수 ticker 종목명 병렬 해석 훅 — TanStack Query useQueries.
 *
 * 분석 결과 카드 목록에서 "종목명으로 검색"을 가능케 하려면 컨테이너가 모든 ticker 의 이름을
 * 한 곳에서 알아야 한다. 카드별 useQueryStockPrice 를 컨테이너로 끌어올려 한 번에 해석한다.
 *   - queryKey/Config 는 stock.price 그대로 → useQueryStockPrice·상세 시트와 캐시 공유(중복 호출 0).
 *   - 이름은 pickStockName 규칙(빈 값/티커 동일값 스킵)으로 정제, 미해석 ticker 는 맵에서 제외(호출부가 ticker 폴백).
 *
 * 컨벤션(`docs/rules/frontend.md` §1): 컴포넌트는 본 훅만 import — useQueries 직접 import 금지.
 */

"use client";

import { useQueries } from "@tanstack/react-query";
import { fetchStockPriceClient } from "@/lib/api/stock/price";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import { pickStockName } from "@/lib/utils/resolveStockName";

/** tickers 각각의 표시명을 병렬 조회해 `{ [ticker]: name }` 맵으로 반환(미해석 ticker 는 키 없음). */
export function useQueryStockNames(tickers: string[]): Record<string, string> {
  const queries = useQueries({
    queries: tickers.map((ticker) => ({
      queryKey: queryKeys.stock.price(ticker),
      queryFn: () => fetchStockPriceClient(ticker),
      enabled: ticker.length > 0,
      staleTime: queryConfig.stock.price.staleTime,
      gcTime: queryConfig.stock.price.gcTime,
      retry: 1,
      refetchOnWindowFocus: false,
    })),
  });

  const names: Record<string, string> = {};
  queries.forEach((q, idx) => {
    const ticker = tickers[idx];
    const resolved = pickStockName(ticker, [q.data?.name]);
    if (resolved) names[ticker] = resolved;
  });
  return names;
}
