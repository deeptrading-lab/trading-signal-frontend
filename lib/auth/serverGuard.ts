/**
 * 서버 라우트 role 게이트 헬퍼 — 페이지(서버 컴포넌트)가 세션 신원을 읽어 등급을 방어한다.
 *
 * Edge 게이트(`proxy.ts`)는 로그인 여부만 보고 role 은 안 보므로(설계상), admin 이상 전용
 * 라우트는 **각 page 가 직접** 이 헬퍼로 방어한다. `readSession` 이 HMAC 서명을 검증하므로
 * 위조된 `role=admin` 쿠키는 통과하지 못한다. `/admin`·`/profile` 이 쓰던 동일 3줄 패턴을 추출.
 *
 * live-role-check: 등급 판정은 **쿠키가 아니라 DB** 를 본다(`resolveLiveIdentity`) — 세션에 구워진
 *   role 은 강등·승인취소를 반영하지 못한다. 스토어 미설정(로컬 dev)이면 세션 값 폴백.
 *
 * 사용:
 *   export default async function Page() {
 *     if (!(await hasServerRole("admin"))) return <AccessDeniedView />;
 *     return <Container />;
 *   }
 */

import { cookies } from "next/headers";
import { readSession, type SessionIdentity } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
  hasLivePrivilege,
  resolveLiveIdentity,
} from "@/lib/server/auth/liveRole";
import type { ProfileRole } from "@/lib/types/auth/profile";

/** 현재 요청의 검증된 세션 신원(위조·만료·형식불량이면 null). */
export async function readServerIdentity(): Promise<SessionIdentity | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return readSession(token);
}

/**
 * 현재 사용자의 **DB 상 등급**이 `required` 이상인가(승인 상태도 함께 확인).
 * null·미상·승인취소·스토어 오류는 전부 false — 안전 실패.
 */
export async function hasServerRole(required: ProfileRole): Promise<boolean> {
  const live = await resolveLiveIdentity(await readServerIdentity());
  return hasLivePrivilege(live, required);
}
