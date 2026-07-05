/**
 * `/profile` — 마이페이지 mock (PR9 finsight-redesign + home-market-redesign PR1 "내 자산" 이전).
 *
 * 구조:
 *   1. 페이지 타이틀 "마이페이지".
 *   2. ProfileCard — hero (avatar + 이름/email + 멤버십·투자성향 칩 + "프로필 수정").
 *   3. "내 자산" 섹션 — 총자산 히어로 + 자산비중 도넛 + 보유종목 전체 테이블.
 *   4. 2-column 그리드 — ConnectedExchangesCard (좌) + 설정 (우, + admin 이상이면 관리자 메뉴).
 *
 * user-login-auth Phase 2 — 세션 role 을 서버에서 읽어 **역할별 메뉴 분리**(위계 `isAtLeast`):
 *   - 설정(모든 유저): 알림·보안·결제·테마·로그아웃.
 *   - **관리자 메뉴**(admin 이상만): 신호 성적표·AI 모의투자·유저 관리(→`/admin`). 운영 도구는
 *     일반 유저에게 노출하지 않는다. nav/설정은 client 라 role 노출 불가 → 서버 조건부 주입(플래시 0).
 *   role 위조는 readSession 의 HMAC 서명 검증이 차단(+ `/admin`·각 라우트 자체 게이트). `cookies()`
 *   사용으로 요청별 동적 렌더(게이트 뒤라 안전).
 *
 * 클라이언트/서버 분리: 본 page.tsx + ProfilePage / 하위 모두 server. HoldingsTable 만 client(정렬).
 * BFF 무관 — mock 단계로 BE·axios 호출 0건(세션 쿠키 읽기는 BE 호출 아님).
 */

import { cookies } from "next/headers";
import { ProfilePage } from "@/components/profile/ProfilePage";
import { readSession } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { isAtLeast } from "@/lib/auth/roles";
import { USER_PROFILE_MOCK } from "@/lib/mock/profile/user";
import { CONNECTED_EXCHANGES_MOCK } from "@/lib/mock/profile/exchanges";
import {
  PROFILE_MENU_ITEMS_MOCK,
  PROFILE_ADMIN_MENU_ITEM,
} from "@/lib/mock/profile/menuItems";
import { PORTFOLIO_MOCK } from "@/lib/mock/profile/portfolio";
import { HOLDINGS_MOCK } from "@/lib/mock/profile/holdings";
import type {
  ProfileMenuItem,
  ProfileMenuKey,
} from "@/lib/types/profile/menuItems";

/** 관리자 메뉴로 분리할 항목(admin 이상만) — 신호 성적표·AI 모의투자는 운영 도구라 일반 유저 미노출. */
const ADMIN_ONLY_KEYS = new Set<ProfileMenuKey>(["SCORECARD", "PAPER_TRADING"]);

export default async function ProfileRoutePage() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const identity = await readSession(token);
  const isAdminOrAbove = isAtLeast(identity?.role, "admin");

  // 설정(모든 유저) — 운영 도구(성적표·모의투자) 제외.
  const settingsItems = PROFILE_MENU_ITEMS_MOCK.filter(
    (item) => !ADMIN_ONLY_KEYS.has(item.key),
  );
  // 관리자 메뉴(admin 이상) — 성적표·모의투자 + 유저 관리(→/admin).
  const adminItems: ProfileMenuItem[] | undefined = isAdminOrAbove
    ? [
        ...PROFILE_MENU_ITEMS_MOCK.filter((item) => ADMIN_ONLY_KEYS.has(item.key)),
        PROFILE_ADMIN_MENU_ITEM,
      ]
    : undefined;

  return (
    <ProfilePage
      user={USER_PROFILE_MOCK}
      exchanges={CONNECTED_EXCHANGES_MOCK}
      menuItems={settingsItems}
      adminItems={adminItems}
      portfolio={PORTFOLIO_MOCK}
      holdings={HOLDINGS_MOCK}
    />
  );
}
