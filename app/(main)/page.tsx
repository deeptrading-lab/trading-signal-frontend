/**
 * `/` — 시장 종합 홈 (home-market-redesign PR2).
 *
 * PRD home-market-redesign §3.1 — 홈을 시장 종합 대시보드로 전면 교체.
 *
 * 서버 컴포넌트. 클라이언트 경계는 MarketOverviewPage 내부 각 컨테이너.
 */

import { MarketOverviewPage } from "@/components/home/MarketOverviewPage";

export default function HomePage() {
  return <MarketOverviewPage />;
}
