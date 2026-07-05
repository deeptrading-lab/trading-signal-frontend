/**
 * useVisibleChartPrefetch — 보이는 순위 상위 행의 일봉 차트를 유휴 시점에 배경 선반입.
 *
 * #253(hover 의도 선반입 + recharts 청크 워밍) 후속. hover 의도 프리패치는 미캐시 종목의 첫 hover 에
 * 여전히 네트워크 왕복을 남긴다. 리스트가 뜬 뒤 **유휴**에 상위 몇 행의 차트를 미리 데워, 실제 hover
 * 시 팝오버/도크가 캐시 히트로 **거의 항상 즉시** 그려지게 한다.
 *
 * ## 레이트리밋 안전 설계(KIS EGW00201 보호)
 *   - **유휴 트리거**: `requestIdleCallback`(초기 렌더 버스트가 가라앉은 뒤 실행). 폴백 setTimeout.
 *   - **상위 소수만**: `MAX_PREFETCH`(6) 행 — 가장 hover 될 법한 상위만(전 14행 아님).
 *   - **무거운 스태거**: 한 건씩 `STAGGER_MS`(400ms) 간격(초당 ~2.5건) — 서버 enrich 팬아웃과 겹침 최소화.
 *   - **마우스 기기만**: `(pointer: fine)` — 터치 전용은 hover peek 이 없어 배경 프리패치 불필요(데이터·한도 절약).
 *   - **세션 dedupe**: 모듈 `warmed` Set — 탭 전환·재마운트로 같은 티커를 다시 스케줄하지 않음.
 *   - **staleTime no-op**: `prefetchQuery` 는 fresh(1일) 캐시면 재호출 안 함(hover 프리패치가 이미 데운 종목 무료).
 *
 * 프리패치 키는 `MiniStockChart` 기본 구간(`MINI_CHART_DEFAULT_DAYS`)을 `warmupFetchDays` 로 환산해
 * `useChartData` 요청과 **정확히 동일**(#253과 같은 단일 출처) → peek 이 그대로 캐시 히트.
 */

"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import { fetchStockChart } from "@/lib/api/stock/chart";
import { warmupFetchDays } from "@/hooks/stock/useChartData";
import { MINI_CHART_DEFAULT_DAYS } from "@/components/stock/MiniStockChart";

/** peek 미니 차트와 동일한 일봉 fetch 봉 수(단일 출처 공유 → 캐시 히트). */
const PEEK_CHART_FETCH_DAYS = warmupFetchDays("D", MINI_CHART_DEFAULT_DAYS);
/** 배경 선반입 상위 행 수(레이트리밋 보수 — 상위만). */
const MAX_PREFETCH = 6;
/** 한 건씩 간격(ms) — 초당 ~2.5건으로 KIS 한도 보호. */
const STAGGER_MS = 400;

/** 세션 dedupe — 이미 스케줄/데운 티커는 다시 선반입하지 않는다(탭 전환·재마운트 무료). */
const warmed = new Set<string>();

/**
 * @param tickers 활성 탭의 행 티커(원순서 — 상위 `MAX_PREFETCH` 만 사용)
 * @param enabled 리스트 뷰일 때만 true(로딩·점검 중 미실행)
 */
export function useVisibleChartPrefetch(tickers: string[], enabled = true): void {
  const qc = useQueryClient();
  // 상위 N 티커만 키로 삼아 effect deps 안정(배열 참조 대신 문자열).
  const targetKey = tickers.slice(0, MAX_PREFETCH).join(",");

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const idleHandle = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    // 터치 전용 기기는 hover peek 이 없어 배경 프리패치 불필요.
    if (!window.matchMedia?.("(pointer: fine)").matches) return;

    const targets = targetKey.split(",").filter((t) => t && !warmed.has(t));
    if (targets.length === 0) return;

    const run = () => {
      targets.forEach((ticker, i) => {
        const timer = setTimeout(() => {
          warmed.add(ticker);
          // prefetchQuery 는 fresh 캐시면 no-op + 에러 삼킴(배경 throw 0).
          void qc.prefetchQuery({
            queryKey: queryKeys.stock.chart(ticker, "D", PEEK_CHART_FETCH_DAYS),
            queryFn: () => fetchStockChart(ticker, PEEK_CHART_FETCH_DAYS, "D"),
            staleTime: queryConfig.stock.daily.staleTime,
            gcTime: queryConfig.stock.daily.gcTime,
          });
        }, i * STAGGER_MS);
        timers.current.push(timer);
      });
    };

    const ric = window.requestIdleCallback;
    if (typeof ric === "function") {
      idleHandle.current = ric(run, { timeout: 3000 });
    } else {
      idleHandle.current = window.setTimeout(run, 1200) as unknown as number;
    }

    const scheduled = timers.current;
    return () => {
      scheduled.forEach(clearTimeout);
      timers.current = [];
      if (idleHandle.current != null) {
        if (typeof window.cancelIdleCallback === "function") {
          window.cancelIdleCallback(idleHandle.current);
        } else {
          clearTimeout(idleHandle.current);
        }
        idleHandle.current = null;
      }
    };
  }, [qc, targetKey, enabled]);
}
