/**
 * 관심종목 영구화 훅 — 단일 진실 원천(저장소 중립).
 *
 * PRD `watchlist-real-data` §3.5 (§9 q1=클라이언트 영구화 / q5=대표주 3종 시드).
 *
 * 공개 시그니처: `{ tickers, addTicker, removeTicker, hasTicker, getName }`.
 *   - 저장소 read/write 는 `lib/api/watchlist/store.ts` 격리 모듈에만 위임 — 본 훅은
 *     브라우저 저장소를 직접 두드리지 않는다(AC-6). 추후 engine API DB 로 교체해도 시그니처 불변.
 *   - 내부 상태는 `{ ticker, name? }` 엔트리 배열이고, BFF 호출용 `tickers: string[]` 는
 *     엔트리에서 파생한다. 추가 시점의 종목명(`addTicker(ticker, name)`)을 함께 들고 다녀,
 *     시세 부분실패(디그레이드 행)에서도 `getName(ticker)` 로 종목을 식별할 수 있다(UI 점검 #2).
 *   - SSR 안전: 초기 state 빈 배열 → mount 후 store 동기화(hydration mismatch 가드).
 *   - 최초 진입(저장소 비어있고 시드 미적용) 시 대표주 3종 자동 시드.
 *     사용자가 전부 삭제해 0개가 되면 재시드 금지(seeded 플래그로 구분).
 *   - 중복 추가 무시, soft cap 30종목(BFF §3.3 과 정합).
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  readEntries,
  writeEntries,
  hasSeeded,
  markSeeded,
  type WatchlistEntry,
} from "@/lib/api/watchlist/store";
import { useToast } from "@/hooks/utils/useToast";
import { WATCHLIST_LIMIT_MSG } from "@/lib/copy/watchlist/labels";

/** 최초 진입 시 자동 시드되는 국내 대표주 3종 — 삼성전자 / SK하이닉스 / NAVER. */
export const WATCHLIST_SEED_ENTRIES: readonly WatchlistEntry[] = [
  { ticker: "005930", name: "삼성전자" },
  { ticker: "000660", name: "SK하이닉스" },
  { ticker: "035420", name: "NAVER" },
];

/** ticker 만 필요한 소비처(BFF 정합 등)를 위한 파생 상수. */
export const WATCHLIST_SEED_TICKERS: readonly string[] =
  WATCHLIST_SEED_ENTRIES.map((e) => e.ticker);

/** soft cap — BFF route 와 정합(§3.3). 초과 추가 무시. */
const MAX_TICKERS = 30;

export type UseWatchlistTickers = {
  tickers: string[];
  /** ticker 추가 — 추가 시점 종목명을 함께 영구화(디그레이드 행 식별용). */
  addTicker: (ticker: string, name?: string) => void;
  removeTicker: (ticker: string) => void;
  hasTicker: (ticker: string) => boolean;
  /** 추가 시점에 저장된 종목명. 미보유(구버전·직접 추가)면 null. */
  getName: (ticker: string) => string | null;
};

export function useWatchlistTickers(): UseWatchlistTickers {
  const toast = useToast();
  // SSR 안전 — 초기엔 빈 배열로 서버/클라 동일, mount 후 store 와 동기화.
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);

  useEffect(() => {
    const stored = readEntries();
    if (stored.length === 0 && !hasSeeded()) {
      // 최초 진입 — 시드 적용 + 플래그 기록(이후 0개여도 재시드 안 함).
      const seeded = WATCHLIST_SEED_ENTRIES.map((e) => ({ ...e }));
      writeEntries(seeded);
      markSeeded();
      setEntries(seeded);
      return;
    }
    setEntries(stored);
  }, []);

  const addTicker = useCallback(
    (ticker: string, name?: string) => {
      // 토스트는 부수효과라 setState updater 안에서 호출 금지 — 현재 entries 로 먼저 판정.
      if (entries.some((e) => e.ticker === ticker)) return; // 이미 담김 — 무동작(거짓 성공 방지).
      if (entries.length >= MAX_TICKERS) {
        toast.info(WATCHLIST_LIMIT_MSG(MAX_TICKERS));
        return;
      }
      setEntries((prev) => {
        // updater 안 동시성 재확인 가드는 유지(연속 호출 시 중복·초과 방지).
        if (
          prev.some((e) => e.ticker === ticker) ||
          prev.length >= MAX_TICKERS
        ) {
          return prev;
        }
        const next = [...prev, name ? { ticker, name } : { ticker }];
        writeEntries(next);
        return next;
      });
    },
    [entries, toast],
  );

  const removeTicker = useCallback((ticker: string) => {
    setEntries((prev) => {
      if (!prev.some((e) => e.ticker === ticker)) return prev;
      const next = prev.filter((e) => e.ticker !== ticker);
      writeEntries(next);
      return next;
    });
  }, []);

  const tickers = useMemo(() => entries.map((e) => e.ticker), [entries]);

  const nameByTicker = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entries) {
      if (e.name) map.set(e.ticker, e.name);
    }
    return map;
  }, [entries]);

  const hasTicker = useCallback(
    (ticker: string) => nameByTicker.has(ticker) || tickers.includes(ticker),
    [nameByTicker, tickers],
  );

  const getName = useCallback(
    (ticker: string) => nameByTicker.get(ticker) ?? null,
    [nameByTicker],
  );

  return { tickers, addTicker, removeTicker, hasTicker, getName };
}
