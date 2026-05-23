/**
 * DashboardPage — `/dashboard` 셸 컴포저 (server component).
 *
 * PR7 (finsight-redesign) 신규.
 *
 * 책임:
 *   - 페이지 타이틀 "대시보드".
 *   - 3 컴포넌트 (PortfolioHero / HoldingsTop3 / MarketSnapshotCard) 를 시안 정보 아키텍처에 맞춰 조합.
 *
 * 구조 (위→아래):
 *   1. 페이지 타이틀 (`text-h1`).
 *   2. PortfolioHero — hero 카드 전폭.
 *   3. 2-column 그리드 (`md:grid-cols-2`):
 *      좌 = HoldingsTop3, 우 = MarketSnapshotCard.
 *
 * 모바일 정보 밀도 — 모든 카드 1-column stacking. 데스크탑 (md+) — 2-column.
 *
 * 클라이언트/서버:
 *   - 본 컴포넌트는 server-safe (useState 0). page.tsx 가 직접 import 후 mock props 전달.
 *
 * BFF 무관 — PR7 mock 단계로 BE 호출 0건. fetch · axios 호출 0건.
 *
 * Sidebar / BottomNav 의 "대시보드" 메뉴 활성 — `isNavItemActive("/dashboard", "/dashboard")` true.
 */

import { PortfolioHero } from "./PortfolioHero";
import { HoldingsTop3 } from "./HoldingsTop3";
import { MarketSnapshotCard } from "./MarketSnapshotCard";
import type { Portfolio } from "@/lib/types/dashboard/portfolio";
import type { Holding } from "@/lib/types/dashboard/holdings";
import type { FearGreed } from "@/lib/types/dashboard/fearGreed";
import type { MarketSnapshot } from "@/lib/types/dashboard/marketSnapshot";
import { DASHBOARD_PAGE_TITLE } from "@/lib/copy/dashboard/labels";

export interface DashboardPageProps {
  portfolio: Portfolio;
  holdings: Holding[];
  fearGreed: FearGreed;
  marketSnapshot: MarketSnapshot;
}

export function DashboardPage({
  portfolio,
  holdings,
  fearGreed,
  marketSnapshot,
}: DashboardPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-main-max-w flex-col gap-lg">
      <h1 className="text-h1 text-text-strong">{DASHBOARD_PAGE_TITLE}</h1>

      <PortfolioHero portfolio={portfolio} />

      <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
        <HoldingsTop3 holdings={holdings} />
        <MarketSnapshotCard
          fearGreed={fearGreed}
          snapshot={marketSnapshot}
        />
      </div>
    </div>
  );
}
