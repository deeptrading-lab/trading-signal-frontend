/**
 * 종목 상세 선반입(prefetch) 훅 — api-optimization-roadmap P1.
 *
 * 검색결과/관심행에서 종목 상세로 이동할 의도(hover·focus·click)가 보이면 상세 진입 전에
 * `stock.price` + `disclosure.company` 를 미리 캐시에 채워, 진입 시 첫 렌더를 앞당긴다.
 *
 * rate-limit 보호:
 *   - **의도 지연**: hover/focus 후 `INTENT_MS`(120ms) 유지 시에만 선반입. 스쳐 지나가는 hover 는
 *     `cancelIntent`(mouseleave/blur)로 취소 → 호출 안 함.
 *   - **staleTime no-op**: `prefetchQuery` 는 캐시가 fresh 하면 재호출하지 않는다(재hover·재방문 무료).
 *     price 10s / company 1d staleTime 이라 같은 종목 반복 hover 는 사실상 1회만 호출.
 *   - click(`prefetch`)은 확정 의도라 지연 없이 즉시.
 *
 * price 는 zustand stock-meta 즉시 페인트가 이미 덮지만(목록 시세 보유 종목), 시세 미보유 종목
 * (검색 신규)·실값 갱신·company(스토어 미보유, 1d) 선반입에 의미가 있다.
 *
 * ## Peek 미니 차트 선반입(opt-in `warmDailyChart`)
 * Peek 팝오버가 마운트되면 `MiniStockChart`(→ 일봉 차트 쿼리)가 그때서야 페치를 시작해 hover 후
 * 1~2초 공백이 생긴다. 이 옵션을 켜면 **hover 의도 시점(팝오버 마운트보다 앞)** 에 같은 일봉 쿼리를
 * 미리 데워, 팝오버가 뜰 땐 캐시 히트로 즉시 그린다. 프리패치 키는 `MiniStockChart` 기본 구간
 * (`MINI_CHART_DEFAULT_DAYS`)을 `warmupFetchDays` 로 환산해 **useChartData 와 정확히 동일**하게 맞춘다.
 * 기본값 false — 상세 이동 전용 선반입 지면(검색·최근 종목)은 차트를 열지 않으므로 과페치하지 않는다.
 */

"use client";

import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import { fetchStockPriceClient } from "@/lib/api/stock/price";
import { fetchDisclosureCompanyClient } from "@/lib/api/disclosure/company";
import { fetchStockChart } from "@/lib/api/stock/chart";
import { warmupFetchDays } from "@/hooks/stock/useChartData";
import { MINI_CHART_DEFAULT_DAYS } from "@/components/stock/MiniStockChart";

const INTENT_MS = 120;

/** Peek 미니 차트가 요청하는 것과 동일한 일봉 fetch 봉 수(useChartData 와 단일 출처 공유). */
const PEEK_CHART_FETCH_DAYS = warmupFetchDays("D", MINI_CHART_DEFAULT_DAYS);

export interface UsePrefetchStockDetailOptions {
  /** Peek 미니 차트(일봉) 쿼리도 함께 데운다. 기본 false(상세 이동 전용 지면은 차트 미사용). */
  warmDailyChart?: boolean;
}

export type PrefetchStockDetail = {
  /** 확정 의도(click) — 지연 없이 즉시 선반입. */
  prefetch: (ticker: string) => void;
  /** hover/focus 시작 — INTENT_MS 유지 시 선반입(지나가는 hover 는 cancelIntent 로 취소). */
  onIntent: (ticker: string) => void;
  /** mouseleave/blur — 대기 중 선반입 취소. */
  cancelIntent: () => void;
};

export function usePrefetchStockDetail(
  { warmDailyChart = false }: UsePrefetchStockDetailOptions = {},
): PrefetchStockDetail {
  const qc = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const prefetch = useCallback(
    (ticker: string) => {
      if (!ticker) return;
      // prefetchQuery 는 fresh 캐시면 no-op + 에러를 삼킨다(hover 중 throw 0).
      void qc.prefetchQuery({
        queryKey: queryKeys.stock.price(ticker),
        queryFn: () => fetchStockPriceClient(ticker),
        staleTime: queryConfig.stock.price.staleTime,
      });
      void qc.prefetchQuery({
        queryKey: queryKeys.disclosure.company(ticker),
        queryFn: () => fetchDisclosureCompanyClient(ticker),
        staleTime: queryConfig.disclosure.company.staleTime,
      });
      // Peek 지면만: 팝오버가 그릴 일봉 차트를 미리 데운다(마운트 시 캐시 히트 → hover 후 공백 제거).
      if (warmDailyChart) {
        void qc.prefetchQuery({
          queryKey: queryKeys.stock.chart(ticker, "D", PEEK_CHART_FETCH_DAYS),
          queryFn: () => fetchStockChart(ticker, PEEK_CHART_FETCH_DAYS, "D"),
          staleTime: queryConfig.stock.daily.staleTime,
          gcTime: queryConfig.stock.daily.gcTime,
        });
      }
    },
    [qc, warmDailyChart],
  );

  const onIntent = useCallback(
    (ticker: string) => {
      clear();
      timer.current = setTimeout(() => prefetch(ticker), INTENT_MS);
    },
    [clear, prefetch],
  );

  // 언마운트 시 대기 타이머 정리.
  useEffect(() => clear, [clear]);

  return { prefetch, onIntent, cancelIntent: clear };
}
