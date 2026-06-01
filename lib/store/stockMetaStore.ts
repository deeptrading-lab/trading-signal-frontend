/**
 * 종목 메타/시세 공유 스토어 (zustand) — 화면 간 "마지막으로 본 시세" 런타임 캐시.
 *
 * PRD `stock-meta-store` (Phase 2 데이터레이어 P0).
 *
 * 왜 React Query 가 아니라 별도 스토어인가:
 *   - React Query 캐시는 **같은 queryKey** 재요청만 dedup 한다. 목록(`watchlist.list`)과 상세
 *     (`stock.price`)는 키가 달라, 목록에서 본 시세를 상세가 재사용하지 못한다.
 *   - 본 스토어는 여러 화면이 참고하는 파생 런타임 값을 한 곳에 모아, 상세 진입 시 즉시 페인트
 *     (`placeholderData`)와 이름 해석 공유 후보를 제공한다.
 *
 * 경계(중요):
 *   - **휘발성**(persist 없음). 새로고침 시 초기화. 사용자 소유 영속 데이터(관심종목·최근검색·
 *     즐겨찾기 = localStorage)와 혼동하지 않는다.
 *   - 쓰기 단일 지점 = `app/providers.tsx` 의 전역 `QueryCache.onSuccess`(쿼리 키 라우팅).
 *     React Query v5 는 `useQuery` 의 onSuccess 가 제거돼, 도메인 훅마다 effect 다는 대신
 *     vanilla `getState().upsertQuotes()` 로 React 밖에서 1곳에서만 쓴다.
 */

import { create } from "zustand";

export type StockDirection = "up" | "down" | "flat";

/** 스토어가 보관하는 종목 단위 메타. */
export type StockMetaQuote = {
  /** 표시명(quote 출처). 신뢰도는 출처별 상이 — 소비처는 user-added 이름을 우선한다. */
  name?: string;
  price: number;
  change: number;
  changePercent: number;
  direction: StockDirection;
  volume: number;
  /** 마지막 갱신 시각(ms). 디버그·후속 TTL 판단용. */
  asOf: number;
};

/** upsert 입력 — `StockPrice`/`WatchlistQuote` 가 구조적으로 그대로 대입된다(추가 필드 무시). */
export type StockQuoteInput = {
  ticker: string;
  name?: string;
  price: number;
  change: number;
  changePercent: number;
  direction: StockDirection;
  volume: number;
};

type StockMetaState = {
  quotes: Record<string, StockMetaQuote>;
  /** 시세 목록을 스토어에 병합(부분 갱신). 빈 배열/누락 ticker 는 무시. */
  upsertQuotes: (items: ReadonlyArray<StockQuoteInput>) => void;
};

export const useStockMetaStore = create<StockMetaState>((set) => ({
  quotes: {},
  upsertQuotes: (items) => {
    if (items.length === 0) return;
    const asOf = Date.now();
    set((state) => {
      const next = { ...state.quotes };
      for (const q of items) {
        if (!q || typeof q.ticker !== "string" || q.ticker.length === 0) continue;
        const prev = next[q.ticker];
        next[q.ticker] = {
          // 이름은 새 값이 있으면 갱신, 없으면 기존 보존.
          name: q.name ?? prev?.name,
          price: q.price,
          change: q.change,
          changePercent: q.changePercent,
          direction: q.direction,
          volume: q.volume,
          asOf,
        };
      }
      return { quotes: next };
    });
  },
}));

/** 단일 ticker 메타 구독 셀렉터(리액티브). 리스트 매핑에서는 `getState().quotes` 직접 읽기. */
export function useStockQuote(ticker: string): StockMetaQuote | undefined {
  return useStockMetaStore((s) => s.quotes[ticker]);
}
