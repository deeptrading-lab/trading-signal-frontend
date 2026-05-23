/**
 * `/dashboard` — 포트폴리오 / 보유 자산 / 오늘장 mock (PR7/9 finsight-redesign).
 *
 * PR7 (finsight-redesign) 신규 — PRD §3.3 PR7 + §5.6 AC-PAGE-1~8.
 *
 * 시안 `Stock and Coin Analysis App/src/app/components/Dashboard.tsx` 정합 정보 아키텍처를
 * 본 저장소 컨벤션 (`docs/rules/frontend.md`) 안에서 재구성. 3 컴포넌트 (`components/dashboard/*`).
 *
 * 구조:
 *   1. 페이지 타이틀 "대시보드".
 *   2. PortfolioHero — 총 자산 + 변동률 + 통계 4-up (다크 그라데이션 hero).
 *   3. 2-column 그리드 — 보유 자산 Top 3 + 오늘장 특징 (Fear & Greed + 상승/하락 종목 수).
 *
 * 클라이언트/서버 분리:
 *   - 본 page.tsx + DashboardPage / PortfolioHero / HoldingsTop3 / MarketSnapshotCard 모두 server component.
 *   - useState 0 — 인터랙티브 셸 없음 (mock 단계). 향후 즐겨찾기 / "전체보기" 클릭 등 도입 시 분리.
 *
 * BFF 무관 — 본 화면은 PR7 mock 단계로 BE 호출 0건. fetch · axios 호출 0건.
 *
 * Sidebar / BottomNav 의 "대시보드" 메뉴 활성 — `isNavItemActive("/dashboard", "/dashboard")` true.
 */

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { PORTFOLIO_MOCK } from "@/lib/mock/dashboard/portfolio";
import { HOLDINGS_MOCK } from "@/lib/mock/dashboard/holdings";
import { FEAR_GREED_MOCK } from "@/lib/mock/dashboard/fearGreed";
import { MARKET_SNAPSHOT_MOCK } from "@/lib/mock/dashboard/marketSnapshot";

export default function DashboardRoutePage() {
  return (
    <DashboardPage
      portfolio={PORTFOLIO_MOCK}
      holdings={HOLDINGS_MOCK}
      fearGreed={FEAR_GREED_MOCK}
      marketSnapshot={MARKET_SNAPSHOT_MOCK}
    />
  );
}
