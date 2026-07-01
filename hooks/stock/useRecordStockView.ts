/**
 * useRecordStockView — 종목 상세를 "본" 즉시 최근 검색 목록에 기록(dedupe + bump).
 *
 * 배경:
 *   검색창 선택(`StockSearchContainer.handleSelect`)만 `addRecentSearch` 를 호출해,
 *   수급(`InvestorFlowTop10Card`)·관심목록(`WatchlistRow`) 등 다른 경로로 진입한 종목은
 *   최근 목록에 남지 않았다. 그 결과 "종목 분석" 사이드 메뉴 재진입
 *   (`useStockNavClick` → `readRecentSearches()[0]`)이 방금 본 종목이 아니라 이전에 검색한
 *   종목으로 되돌아갔다. 진입 경로와 무관하게 "마지막으로 본 종목"을 최근 목록 맨 앞으로
 *   올려 재진입 대상을 화면과 일치시킨다.
 *
 * 이름 우선순위(`StockHeader` 와 동일): watchlist store → stock-meta store(시세 응답명).
 *   이름 미해결 시 ticker 로 우선 기록하고, 시세 응답으로 이름이 채워지면 같은 항목을 갱신
 *   (`addRecentSearch` 의 dedupe + bump 로 중복 없이 대체).
 */

"use client";

import { useEffect } from "react";
import { addRecentSearch } from "@/lib/utils/recentSearch";
import { pickStockName } from "@/lib/utils/resolveStockName";
import { useStockQuote } from "@/lib/store/stockMetaStore";
import { useWatchlistTickers } from "@/hooks/watchlist/useWatchlistTickers";

export function useRecordStockView(ticker: string): void {
  const storeName = useStockQuote(ticker)?.name;
  const { getName } = useWatchlistTickers();
  const name = pickStockName(ticker, [getName(ticker), storeName]) ?? ticker;

  useEffect(() => {
    if (!ticker) return;
    addRecentSearch({ ticker, name });
  }, [ticker, name]);
}
