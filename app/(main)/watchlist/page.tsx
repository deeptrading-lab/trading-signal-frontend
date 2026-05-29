/**
 * `/watchlist` — 관심종목 KIS 실데이터 (watchlist-real-data).
 *
 * PRD `watchlist-real-data` §3.6 방안 A — page.tsx 는 server 유지, 데이터/상태/인터랙션은
 * `WatchlistContainer`(client) 가 담당. mock(server import) → 실데이터(client + 훅) 전환.
 *
 * 데이터 경로: `useWatchlistTickers`(localStorage 영구화) → `useQueryWatchlist`(BFF `/api/watchlist`).
 * 본 page.tsx 자체는 BFF/fetch 호출 0 — 데이터는 컨테이너의 커스텀훅 경유.
 *
 * Sidebar / BottomNav 의 "관심종목" 메뉴 활성 — `isNavItemActive("/watchlist", "/watchlist")` true.
 */

import { WatchlistContainer } from "@/components/watchlist/WatchlistContainer";

export default function WatchlistRoutePage() {
  return <WatchlistContainer />;
}
