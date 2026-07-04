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
 * user-login-auth — 세션 role 을 서버에서 읽어 **관리자(admin)에게만** "가입 승인 관리"(→`/admin`)
 *   진입점을 설정 메뉴에 주입한다. nav/설정은 client 라 role 노출 불가 → 서버 조건부 주입으로
 *   비관리자 노출·플래시 0. role 위조는 readSession 의 HMAC 서명 검증이 차단(+ `/admin` 자체 게이트).
 *   `cookies()` 사용으로 본 라우트는 요청별 동적 렌더(게이트 뒤라 안전).
 *
 * 클라이언트/서버 분리:
 *   - 본 page.tsx + ProfilePage / ProfileCard / AssetHero / Exchanges / Settings 모두 server.
 *   - HoldingsTable(AssetSection 내부)만 client(정렬 상태).
 *
 * BFF 무관 — 본 화면은 mock 단계로 BE·axios 호출 0건(세션 쿠키 읽기는 BE 호출 아님).
 *
 * Sidebar / BottomNav 의 "마이페이지" 메뉴 활성 — `isNavItemActive("/profile", "/profile")` true.
 */

import { cookies } from "next/headers";
import { ProfilePage } from "@/components/profile/ProfilePage";
import { readSession } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { USER_PROFILE_MOCK } from "@/lib/mock/profile/user";
import { CONNECTED_EXCHANGES_MOCK } from "@/lib/mock/profile/exchanges";
import {
  PROFILE_MENU_ITEMS_MOCK,
  PROFILE_ADMIN_MENU_ITEM,
} from "@/lib/mock/profile/menuItems";
import { PORTFOLIO_MOCK } from "@/lib/mock/profile/portfolio";
import { HOLDINGS_MOCK } from "@/lib/mock/profile/holdings";

export default async function ProfileRoutePage() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const identity = await readSession(token);
  const menuItems =
    identity?.role === "admin"
      ? [...PROFILE_MENU_ITEMS_MOCK, PROFILE_ADMIN_MENU_ITEM]
      : PROFILE_MENU_ITEMS_MOCK;

  return (
    <ProfilePage
      user={USER_PROFILE_MOCK}
      exchanges={CONNECTED_EXCHANGES_MOCK}
      menuItems={menuItems}
      portfolio={PORTFOLIO_MOCK}
      holdings={HOLDINGS_MOCK}
    />
  );
}
