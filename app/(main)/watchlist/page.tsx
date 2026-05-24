/**
 * `/watchlist` — 관심종목 mock (PR9/9 finsight-redesign).
 *
 * PR9 (finsight-redesign) 신규 — PRD §3.3 PR9 + §5.6 AC-PAGE-1~8.
 *
 * 시안 `Stock and Coin Analysis App/src/app/components/Watchlist.tsx` 정합 정보 아키텍처를
 * 본 저장소 컨벤션 (`docs/rules/frontend.md`) 안에서 재구성. 페이지 셸 + 12-col grid 테이블
 * (`components/watchlist/*`).
 *
 * 구조:
 *   1. 페이지 헤더 — Star 아이콘 + "관심종목" + "+ 그룹 추가" 버튼.
 *   2. WatchlistTable — 6 row (주식 3 + 코인 3) 12-col grid.
 *
 * 클라이언트/서버 분리:
 *   - 본 page.tsx + WatchlistPage / WatchlistTable / WatchlistRow 모두 server component.
 *   - useState 0 — 인터랙티브 셸 없음 (mock 단계).
 *
 * BFF 무관 — 본 화면은 PR9 mock 단계로 BE 호출 0건. fetch · axios 호출 0건.
 *
 * Sidebar / BottomNav 의 "관심종목" 메뉴 활성 — `isNavItemActive("/watchlist", "/watchlist")` true.
 * catch-all (`app/(main)/[...not_found]/page.tsx`) 보다 구체적 라우트 우선 매칭 → catch-all 자연 무력화.
 */

import { WatchlistPage } from "@/components/watchlist/WatchlistPage";
import { WATCHLIST_ITEMS_MOCK } from "@/lib/mock/watchlist/items";

export default function WatchlistRoutePage() {
  return <WatchlistPage items={WATCHLIST_ITEMS_MOCK} />;
}
