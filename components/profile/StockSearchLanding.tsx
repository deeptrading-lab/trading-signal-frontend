/**
 * StockSearchLanding — `/stock` 검색 랜딩.
 *
 * "종목 분석" 메뉴를 눌렀을 때 최근 본 종목이 없으면 이 화면으로 진입한다(useStockNavClick).
 * 종목을 검색하면 `/stock/<ticker>` 상세로 이동(StockSearchContainer 내부 라우팅).
 *
 * StockProfilePage 와 동일한 헤더 톤(BarChart2 + "종목 분석") + 검색창 + 안내 카피.
 * server-safe — 내부 검색만 client(StockSearchContainer).
 */

import { BarChart2 } from "lucide-react";
import { StockSearchContainer } from "@/components/home/StockSearchContainer";
import { NAV_MENU_STOCK } from "@/lib/copy/layout/navCopy";

const LANDING_HINT = "종목명·코드로 검색하면 차트·기업개황·최근 공시를 한눈에 볼 수 있어요.";

export function StockSearchLanding() {
  return (
    <div className="mx-auto w-full max-w-main-max-w flex flex-col gap-lg">
      <header className="flex items-center gap-sm">
        <BarChart2 className="h-2xl w-2xl text-accent-vivid" aria-hidden="true" />
        <h1 className="text-h1 text-text-strong">{NAV_MENU_STOCK}</h1>
      </header>
      <StockSearchContainer />
      <p className="text-body-md text-text-muted">{LANDING_HINT}</p>
    </div>
  );
}
