/**
 * `/profile` — 마이페이지 mock (PR9/9 finsight-redesign).
 *
 * PR9 (finsight-redesign) 신규 — PRD §3.3 PR9 + §5.6 AC-PAGE-1~8.
 *
 * 시안 `Stock and Coin Analysis App/src/app/components/Profile.tsx` 정합 정보 아키텍처를
 * 본 저장소 컨벤션 (`docs/rules/frontend.md`) 안에서 재구성. 3 카드 (`components/profile/*`).
 *
 * 구조:
 *   1. 페이지 타이틀 "마이페이지".
 *   2. ProfileCard — hero (avatar + 이름/email + 멤버십·투자성향 칩 + "프로필 수정").
 *   3. 2-column 그리드 — ConnectedExchangesCard (좌, 3건) + SettingsMenuCard (우, 4 + 로그아웃).
 *
 * 클라이언트/서버 분리:
 *   - 본 page.tsx + ProfilePage / ProfileCard / ConnectedExchangesCard / SettingsMenuCard 모두 server.
 *   - useState 0 — 인터랙티브 셸 없음 (mock 단계).
 *
 * BFF 무관 — 본 화면은 PR9 mock 단계로 BE 호출 0건. fetch · axios 호출 0건.
 *
 * Sidebar / BottomNav 의 "마이페이지" 메뉴 활성 — `isNavItemActive("/profile", "/profile")` true.
 * catch-all (`app/(main)/[...not_found]/page.tsx`) 보다 구체적 라우트 우선 매칭 → catch-all 자연 무력화.
 */

import { ProfilePage } from "@/components/profile/ProfilePage";
import { USER_PROFILE_MOCK } from "@/lib/mock/profile/user";
import { CONNECTED_EXCHANGES_MOCK } from "@/lib/mock/profile/exchanges";
import { PROFILE_MENU_ITEMS_MOCK } from "@/lib/mock/profile/menuItems";

export default function ProfileRoutePage() {
  return (
    <ProfilePage
      user={USER_PROFILE_MOCK}
      exchanges={CONNECTED_EXCHANGES_MOCK}
      menuItems={PROFILE_MENU_ITEMS_MOCK}
    />
  );
}
