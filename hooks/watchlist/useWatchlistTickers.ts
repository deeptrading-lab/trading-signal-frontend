/**
 * 관심종목 ticker 영구화 훅 — 단일 진실 원천(저장소 중립).
 *
 * PRD `watchlist-real-data` §3.5 (§9 q1=클라이언트 영구화 / q5=대표주 3종 시드).
 *
 * 공개 시그니처: `{ tickers, addTicker, removeTicker, hasTicker }`.
 *   - 저장소 read/write 는 `lib/api/watchlist/store.ts` 격리 모듈에만 위임 — 본 훅은
 *     브라우저 저장소를 직접 두드리지 않는다(AC-6). 추후 engine API DB 로 교체해도 시그니처 불변.
 *   - SSR 안전: 초기 state 빈 배열 → mount 후 store 동기화(hydration mismatch 가드).
 *   - 최초 진입(저장소 비어있고 시드 미적용) 시 대표주 3종 자동 시드.
 *     사용자가 전부 삭제해 0개가 되면 재시드 금지(seeded 플래그로 구분).
 *   - 중복 추가 무시, soft cap 30종목(BFF §3.3 과 정합).
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  readTickers,
  writeTickers,
  hasSeeded,
  markSeeded,
} from "@/lib/api/watchlist/store";

/** 최초 진입 시 자동 시드되는 국내 대표주 3종 — 삼성전자 / SK하이닉스 / NAVER. */
export const WATCHLIST_SEED_TICKERS: readonly string[] = [
  "005930",
  "000660",
  "035420",
];

/** soft cap — BFF route 와 정합(§3.3). 초과 추가 무시. */
const MAX_TICKERS = 30;

export type UseWatchlistTickers = {
  tickers: string[];
  addTicker: (ticker: string) => void;
  removeTicker: (ticker: string) => void;
  hasTicker: (ticker: string) => boolean;
};

export function useWatchlistTickers(): UseWatchlistTickers {
  // SSR 안전 — 초기엔 빈 배열로 서버/클라 동일, mount 후 store 와 동기화.
  const [tickers, setTickers] = useState<string[]>([]);

  useEffect(() => {
    const stored = readTickers();
    if (stored.length === 0 && !hasSeeded()) {
      // 최초 진입 — 시드 적용 + 플래그 기록(이후 0개여도 재시드 안 함).
      const seeded = [...WATCHLIST_SEED_TICKERS];
      writeTickers(seeded);
      markSeeded();
      setTickers(seeded);
      return;
    }
    setTickers(stored);
  }, []);

  const addTicker = useCallback(
    (ticker: string) => {
      setTickers((prev) => {
        if (prev.includes(ticker) || prev.length >= MAX_TICKERS) return prev;
        const next = [...prev, ticker];
        writeTickers(next);
        return next;
      });
    },
    [],
  );

  const removeTicker = useCallback((ticker: string) => {
    setTickers((prev) => {
      if (!prev.includes(ticker)) return prev;
      const next = prev.filter((t) => t !== ticker);
      writeTickers(next);
      return next;
    });
  }, []);

  const hasTicker = useCallback(
    (ticker: string) => tickers.includes(ticker),
    [tickers],
  );

  return { tickers, addTicker, removeTicker, hasTicker };
}
