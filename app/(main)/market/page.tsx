/**
 * `/market` — 인기 테마 / 섹터 + 주요 지수 mock (PR8/9 finsight-redesign).
 *
 * PR8 (finsight-redesign) 신규 — PRD §3.3 PR8 + §5.6 AC-PAGE-1~8.
 *
 * 시안 `Stock and Coin Analysis App/src/app/components/MarketTrends.tsx` 정합 정보 아키텍처를
 * 본 저장소 컨벤션 (`docs/rules/frontend.md`) 안에서 재구성. 2 카드 (`components/market/*`).
 *
 * 구조:
 *   1. 페이지 타이틀 "시장 동향" + Compass 아이콘.
 *   2. 2-column 그리드 — ThemesCard (좌, 4 테마) + IndicesCard (우, 6 지수 2-col grid).
 *
 * 클라이언트/서버 분리:
 *   - 본 page.tsx + MarketPage / ThemesCard / IndicesCard 모두 server component.
 *   - useState 0 — 인터랙티브 셸 없음 (mock 단계).
 *
 * BFF 무관 — 본 화면은 PR8 mock 단계로 BE 호출 0건. fetch · axios 호출 0건.
 *
 * Sidebar / BottomNav 의 "시장 동향" 메뉴 활성 — `isNavItemActive("/market", "/market")` true.
 * catch-all (`app/(main)/[...not_found]/page.tsx`) 보다 구체적 라우트 우선 매칭 → catch-all 자연 무력화.
 */

import { MarketPage } from "@/components/market/MarketPage";
import { MARKET_THEMES_MOCK } from "@/lib/mock/market/themes";
import { MARKET_INDICES_MOCK } from "@/lib/mock/market/indices";

export default function MarketRoutePage() {
  return (
    <MarketPage
      themes={MARKET_THEMES_MOCK}
      indices={MARKET_INDICES_MOCK}
    />
  );
}
