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
 */

"use client";

import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import { fetchStockPriceClient } from "@/lib/api/stock/price";
import { fetchDisclosureCompanyClient } from "@/lib/api/disclosure/company";

const INTENT_MS = 120;

export type PrefetchStockDetail = {
  /** 확정 의도(click) — 지연 없이 즉시 선반입. */
  prefetch: (ticker: string) => void;
  /** hover/focus 시작 — INTENT_MS 유지 시 선반입(지나가는 hover 는 cancelIntent 로 취소). */
  onIntent: (ticker: string) => void;
  /** mouseleave/blur — 대기 중 선반입 취소. */
  cancelIntent: () => void;
};

export function usePrefetchStockDetail(): PrefetchStockDetail {
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
    },
    [qc],
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
