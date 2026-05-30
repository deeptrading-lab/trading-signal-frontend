/**
 * 복수 ticker 공시 병렬 조회 훅 — TanStack Query useQueries.
 *
 * home-market-redesign PR2 신규.
 *
 * `useQueryDisclosures(tickers, count)`:
 *   - tickers 배열 → 각 ticker 별 `/api/disclosure/list?ticker=X&count=N` 병렬 호출.
 *   - 결과를 flat + rceptDate 기준 최신순 정렬.
 *   - staleTime 5분 (신규 공시 반영 주기 정합).
 *   - `ticker` 필드를 DisclosureItem 에 주입해 공시 피드에서 종목 배지로 활용.
 *
 * 컨벤션 (`docs/rules/frontend.md` §1):
 *   - 컴포넌트는 본 훅만 import — useQuery/useQueries 직접 import 금지.
 *   - queryKey 는 `queryKeys.disclosure.list(ticker, count)` 그대로 활용.
 */

"use client";

import { useQueries } from "@tanstack/react-query";
import { fetchDisclosureListClient } from "@/lib/api/disclosure/list";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { DisclosureItem } from "@/lib/api/dart/types";

/** 공시 피드 아이템 — DisclosureItem + ticker (종목 배지 표시용). */
export type DisclosureFeedItem = DisclosureItem & {
  /** 공시 종목 코드 (6자리). */
  ticker: string;
};

export type UseQueryDisclosuresResult = {
  /** 플래팅 + 최신순 정렬된 공시 목록. */
  items: DisclosureFeedItem[];
  isLoading: boolean;
  isError: boolean;
};

/**
 * tickers 배열의 각 ticker 에 대해 공시 N건을 병렬 조회 후 최신순 플래팅.
 *
 * @param tickers 조회 대상 ticker 배열. 빈 배열이면 즉시 빈 결과 반환.
 * @param count 각 ticker 당 조회할 공시 건수. 기본값 3.
 */
export function useQueryDisclosures(
  tickers: string[],
  count: number = 3,
): UseQueryDisclosuresResult {
  const queries = useQueries({
    queries: tickers.map((ticker) => ({
      queryKey: queryKeys.disclosure.list(ticker, count),
      queryFn: () => fetchDisclosureListClient(ticker, count),
      enabled: ticker.length > 0,
      staleTime: queryConfig.disclosure.list.staleTime,
      gcTime: queryConfig.disclosure.list.gcTime,
      retry: 1,
      refetchOnWindowFocus: false,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.every((q) => q.isError);

  const items: DisclosureFeedItem[] = queries
    .flatMap((q, idx) => {
      if (!q.data) return [];
      const ticker = tickers[idx];
      return q.data.map((item) => ({ ...item, ticker }));
    })
    .sort((a, b) => {
      // rceptDate: ISO 8601 일자 문자열 — 최신순(내림차순) 정렬.
      return b.rceptDate.localeCompare(a.rceptDate);
    });

  return { items, isLoading, isError };
}
