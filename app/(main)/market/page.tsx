/**
 * `/market` — 인기 테마 / 섹터(mock) + 주요 지수(KIS 실데이터).
 *
 * PRD `market-real-data` §3.5 — 지수 카드를 mock → KIS `inquire-index-price` 실데이터로 전환.
 *
 * 구조:
 *   1. 페이지 타이틀 "시장 동향" + Compass 아이콘.
 *   2. 2-column 그리드 — ThemesCard(좌, mock 유지 — §4 q2) + IndicesCardContainer(우, 국내 3종 실데이터).
 *
 * 클라이언트/서버 분리:
 *   - 본 page.tsx + MarketPage / ThemesCard 는 server component(테마 mock props).
 *   - 지수 영역만 `IndicesCardContainer`('use client') 가 `useQueryIndices` 로 BFF 경유 fetch.
 *
 * Sidebar / BottomNav 의 "시장 동향" 메뉴 활성 — `isNavItemActive("/market", "/market")` true.
 * catch-all (`app/(main)/[...not_found]/page.tsx`) 보다 구체적 라우트 우선 매칭 → catch-all 자연 무력화.
 */

import { MarketPage } from "@/components/market/MarketPage";
import { MARKET_THEMES_MOCK } from "@/lib/mock/market/themes";

export default function MarketRoutePage() {
  return <MarketPage themes={MARKET_THEMES_MOCK} />;
}
