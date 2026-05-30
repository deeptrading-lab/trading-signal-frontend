/**
 * `/profile` — 마이페이지 mock (PR9 finsight-redesign + home-market-redesign PR1 "내 자산" 이전).
 *
 * 구조:
 *   1. 페이지 타이틀 "마이페이지".
 *   2. ProfileCard — hero (avatar + 이름/email + 멤버십·투자성향 칩 + "프로필 수정").
 *   3. "내 자산" 섹션 — 총자산 히어로 + 자산비중 도넛 + 보유종목 전체 테이블
 *      (home-market-redesign PR1 — 계좌 위젯 `/dashboard` → `/profile` 이전, PRD §3.1 / AC-2).
 *   4. 2-column 그리드 — ConnectedExchangesCard (좌, 3건) + SettingsMenuCard (우, 4 + 로그아웃).
 *
 * 클라이언트/서버 분리:
 *   - 본 page.tsx + ProfilePage / ProfileCard / AssetHero / Exchanges / Settings 모두 server.
 *   - HoldingsTable(AssetSection 내부)만 client(정렬 상태).
 *
 * BFF 무관 — 본 화면은 mock 단계로 BE 호출 0건. fetch · axios 호출 0건.
 *
 * Sidebar / BottomNav 의 "마이페이지" 메뉴 활성 — `isNavItemActive("/profile", "/profile")` true.
 * catch-all (`app/(main)/[...not_found]/page.tsx`) 보다 구체적 라우트 우선 매칭 → catch-all 자연 무력화.
 */

import { ProfilePage } from "@/components/profile/ProfilePage";
import { USER_PROFILE_MOCK } from "@/lib/mock/profile/user";
import { CONNECTED_EXCHANGES_MOCK } from "@/lib/mock/profile/exchanges";
import { PROFILE_MENU_ITEMS_MOCK } from "@/lib/mock/profile/menuItems";
import { PORTFOLIO_MOCK } from "@/lib/mock/profile/portfolio";
import { HOLDINGS_MOCK } from "@/lib/mock/profile/holdings";

export default function ProfileRoutePage() {
  return (
    <ProfilePage
      user={USER_PROFILE_MOCK}
      exchanges={CONNECTED_EXCHANGES_MOCK}
      menuItems={PROFILE_MENU_ITEMS_MOCK}
      portfolio={PORTFOLIO_MOCK}
      holdings={HOLDINGS_MOCK}
    />
  );
}
