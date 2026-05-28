/**
 * StockProfilePage — `/profile/[ticker]` 종목 상세 셸.
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

import { StockHeader } from "./StockHeader";
import { StockDailyChart } from "./StockDailyChart";
import { CompanyOverview } from "./CompanyOverview";
import { DisclosureList } from "./DisclosureList";

export interface StockProfilePageProps {
  ticker: string;
}

export function StockProfilePage({ ticker }: StockProfilePageProps) {
  return (
    <div className="mx-auto w-full max-w-main-max-w flex flex-col gap-lg">
      <StockHeader ticker={ticker} />
      <StockDailyChart ticker={ticker} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <CompanyOverview ticker={ticker} />
        <DisclosureList ticker={ticker} count={5} />
      </div>
    </div>
  );
}
