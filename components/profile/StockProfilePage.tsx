/**
 * StockProfilePage — `/stock/[ticker]` 종목 상세 셸.
 *
 * PRD `stock-api-integration` (PR-B) §3.5 — Profile 도메인 종단 전환의 컴포저.
 *
 * 책임:
 *   - 4개 영역을 데스크탑 2-column, 모바일 1-column stacking 으로 조합.
 *     1. StockHeader      — `useQueryStockPrice(ticker)`
 *     2. StockDailyChart  — `useQueryStockDaily(ticker, 'D')`
 *     3. CompanyOverview  — `useQueryDisclosureCompany(ticker)`
 *     4. DisclosureList   — `useQueryDisclosureList(ticker, 5)`
 *   - 각 자식이 자체 로딩·에러·빈 상태를 책임. 본 셸은 그리드 + 헤더만.
 *
 * 본 컴포넌트는 server-safe — useState 0. 자식들이 `'use client'` (TanStack Query 호출 위해).
 * page.tsx 가 params.ticker 를 props 로 전달.
 *
 * AC-8 종단 검증의 단일 진입점.
 */

import { BarChart2 } from "lucide-react";
import { StockSearchContainer } from "@/components/home/StockSearchContainer";
import { StockPageLayout } from "./StockPageLayout";
import { IntradayReadSection } from "@/components/stock/IntradayReadSection";
import { NAV_MENU_STOCK } from "@/lib/copy/layout/navCopy";

export interface StockProfilePageProps {
  ticker: string;
  /** 검색창 초기값 — "종목 분석" 메뉴로 진입(useStockNavClick) 시 현재 종목명을 미리 채운다. */
  initialKeyword?: string;
}

export function StockProfilePage({ ticker, initialKeyword }: StockProfilePageProps) {
  return (
    <div className="mx-auto w-full max-w-main-max-w flex flex-col gap-lg">
      <header className="flex items-center gap-sm">
        <BarChart2 className="h-2xl w-2xl text-accent-vivid" aria-hidden="true" />
        <h1 className="text-h1 text-text-strong">{NAV_MENU_STOCK}</h1>
      </header>
      <StockSearchContainer initialKeyword={initialKeyword} />
      <StockPageLayout ticker={ticker} />
      <IntradayReadSection ticker={ticker} />
    </div>
  );
}
