/**
 * 세션 신원 → **DB 대조 신원** 해석 (live-role-check).
 *
 * 배경: 세션 쿠키는 발급 시점의 `role` 을 구워 담고 `status` 는 아예 싣지 않는다. 그래서 관리자를
 *   강등하거나 승인을 취소해도 이미 발급된 쿠키에는 반영되지 않아, 쿠키 만료까지 옛 등급으로
 *   특권 경로를 계속 쓸 수 있었다. 서버가 남의 쿠키를 지울 방법은 없으므로, **특권을 판정하는
 *   쪽이 요청 시점에 DB 를 확인**한다.
 *
 * 적용 범위 — 관리자 API/페이지 등 **저빈도 특권 경로만**. 일반 조회 API 와 Edge 게이트
 *   (`proxy.ts`)는 그대로 둔다(게이트는 "네트워크 I/O 0"이 설계 원칙 — AC-15). 관리자 라우트는
 *   사용자 클릭 기반이라 요청당 Supabase 1콜이 붙어도 무시할 만하고, cron·스케줄러·워커는 HTTP 를
 *   타지 않고 `lib/server` 함수를 직접 import 하므로 영향이 없다.
 *
 * 실패 정책:
 *   - 스토어 **미설정**(로컬 dev, Supabase 없음) → 세션 값으로 폴백(`live: false`). 개발 무마찰.
 *   - 스토어 **오류**(네트워크·REST 실패) → **거부**(null). 설정돼 있는데 확인이 안 되면 열지 않는다.
 *   - 프로필 **행 없음**(삭제된 유저) → 거부.
 *   승인 상태(`status`)는 그대로 반환하고, 특권 여부 판정은 호출부가 `hasLivePrivilege` 로 한다
 *   (`/api/auth/me` 처럼 pending 을 **표시**해야 하는 소비처가 있기 때문).
 */

import { isAtLeast } from "@/lib/auth/roles";
import { getProfileBySub, isProfileStoreConfigured } from "@/lib/server/auth/profileStore";
import type { SessionIdentity } from "@/lib/auth/session";
import type { ProfileRole, ProfileStatus } from "@/lib/types/auth/profile";

export type LiveIdentity = {
  sub: string;
  email: string | null;
  role: ProfileRole;
  status: ProfileStatus;
  /** true = DB 확인분. false = 스토어 미설정으로 세션 값 폴백(로컬 dev). */
  live: boolean;
};

/**
 * 세션 신원을 DB 와 대조해 현재 등급·승인상태를 돌려준다. 거부해야 하면 null.
 * 세션 자체가 없거나 신원 세션이 아니면(sub 없음) null.
 */
export async function resolveLiveIdentity(
  identity: SessionIdentity | null,
): Promise<LiveIdentity | null> {
  if (!identity?.sub) return null;

  // 로컬 dev 등 스토어 미설정 — 세션 값 그대로. 확인할 DB 가 없는 것이지 거부 사유는 아니다.
  if (!isProfileStoreConfigured()) {
    return {
      sub: identity.sub,
      email: identity.email ?? null,
      role: identity.role ?? "user",
      status: "approved",
      live: false,
    };
  }

  let profile: Awaited<ReturnType<typeof getProfileBySub>>;
  try {
    profile = await getProfileBySub(identity.sub);
  } catch (error) {
    // fail-closed — 설정된 스토어가 답을 못 주면 특권을 열지 않는다.
    console.warn(
      "[live-role] 프로필 조회 실패 — 특권 거부",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }

  if (!profile) return null; // 삭제된 유저.

  return {
    sub: profile.sub,
    email: profile.email,
    role: profile.role,
    status: profile.status,
    live: true,
  };
}

/** 특권 판정 — 승인 상태(approved)이면서 등급이 `required` 이상. 미상은 false(안전 실패). */
export function hasLivePrivilege(
  live: LiveIdentity | null,
  required: ProfileRole,
): boolean {
  if (!live || live.status !== "approved") return false;
  return isAtLeast(live.role, required);
}
