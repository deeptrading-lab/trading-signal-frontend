/**
 * `/profile` — 마이페이지.
 *
 * profile-real-data — mock 주입(김투자·총자산 1.4억·키움/업비트 연동)을 걷어내고 `profiles`
 *   테이블 실데이터로 교체했다. 자산·보유종목·연동거래소 섹션은 원천이 없어 삭제.
 *
 * 서버에서 세션 신원(`readSession`)으로 프로필을 읽는다:
 *   - 세션은 sub/email/role 만 들고 있으므로 표시명·가입일·승인상태는 `getProfileBySub` 로 조회.
 *   - 스토어 미설정/오류는 세션 값만으로 축약 프로필을 만들어 페이지를 살린다(fail-soft) —
 *     마이페이지는 로그아웃 진입점이라 DB 가 죽어도 렌더돼야 한다.
 *   - 세션 자체가 없으면(로컬 dev, OAuth 미설정) 게스트 표기.
 *
 * 역할별 메뉴 분리(위계 `isAtLeast`): 설정(전체) / 관리자 메뉴(admin 이상 — 성적표·유저관리).
 *   nav·설정은 client 라 role 노출 불가 → 서버 조건부 주입(플래시 0). role 위조는 readSession
 *   의 HMAC 서명 검증이 차단(+ `/admin`·각 라우트 자체 게이트).
 */

import { cookies } from "next/headers";
import { ProfilePage } from "@/components/profile/ProfilePage";
import { readSession } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { isAtLeast } from "@/lib/auth/roles";
import { getProfileBySub } from "@/lib/server/auth/profileStore";
import {
  PROFILE_MENU_ITEMS,
  PROFILE_SCORECARD_MENU_ITEM,
  PROFILE_ADMIN_MENU_ITEM,
} from "@/lib/types/profile/menuItemsConfig";
import type { ProfileMenuItem } from "@/lib/types/profile/menuItems";
import type { Profile } from "@/lib/types/auth/profile";

/** 게스트(세션 없음) — 로컬 dev·OAuth 미설정에서도 지면이 깨지지 않게 하는 최소 프로필. */
const GUEST_PROFILE: Profile = {
  sub: "",
  email: "게스트",
  role: "user",
  status: "approved",
  displayName: null,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

export default async function ProfileRoutePage() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const identity = await readSession(token);
  const isAdminOrAbove = isAtLeast(identity?.role, "admin");

  let profile: Profile = GUEST_PROFILE;
  if (identity?.sub) {
    // DB 조회 실패는 페이지를 막지 않는다 — 세션 값만으로 축약 프로필(fail-soft).
    const stored = await getProfileBySub(identity.sub).catch(() => null);
    profile = stored ?? {
      ...GUEST_PROFILE,
      sub: identity.sub,
      email: identity.email ?? GUEST_PROFILE.email,
      role: identity.role ?? "user",
    };
  }

  const adminItems: ProfileMenuItem[] | undefined = isAdminOrAbove
    ? [PROFILE_SCORECARD_MENU_ITEM, PROFILE_ADMIN_MENU_ITEM]
    : undefined;

  return (
    <ProfilePage
      profile={profile}
      menuItems={PROFILE_MENU_ITEMS}
      adminItems={adminItems}
    />
  );
}
