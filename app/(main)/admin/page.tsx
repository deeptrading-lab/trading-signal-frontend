/**
 * `/admin` — 가입 승인 화면(서버 컴포넌트, role==admin 자체 게이트).
 *
 * PRD `user-login-auth` §3.7 / AC-11:
 *   - Edge 게이트(`proxy.ts`)는 role 을 보지 않으므로(네트워크 I/O 0) **본 page 가 직접 role 을 방어**한다.
 *   - 세션 신원(`readSession`)의 `role !== "admin"` 이면 `notFound()` — 비관리자에게 존재 자체를 숨긴다
 *     (`(main)/not-found.tsx` 가 셸 안에서 404 안내). 위조 role 은 HMAC 검증에서 걸러진다.
 *   - 승인 조작(대기 목록·승인)은 클라이언트 패널이 `/api/admin/approvals` 경유(BFF) — 라우트가 재차 role 방어.
 *
 * `cookies()`(next/headers) 사용으로 요청별 동적 렌더 — 세션 신원을 서버에서 읽어 즉시 판정한다.
 */

import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { isAtLeast } from "@/lib/auth/roles";
import { AdminApprovalsPanel } from "@/components/admin/AdminApprovalsPanel";
import { SuperadminUsersPanel } from "@/components/admin/SuperadminUsersPanel";

export default async function AdminPage() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const identity = await readSession(token);
  // admin 이상(admin·superadmin)만 접근. 위조 role 은 readSession HMAC 검증이 차단.
  if (!isAtLeast(identity?.role, "admin")) {
    notFound();
  }

  // superadmin → 전체 유저 관리(등급 조정), admin → 대기 승인. (route 도 각 등급 자체 방어)
  return identity?.role === "superadmin" ? <SuperadminUsersPanel /> : <AdminApprovalsPanel />;
}
