/**
 * `/admin` — 유저 관리 화면(서버 컴포넌트, **admin 이상** role 게이트).
 *
 * PRD user-login-auth §3.7 / Phase 2:
 *   - Edge 게이트(`proxy.ts`)는 role 을 안 보므로 **본 page 가 직접 방어**한다: `readSession` 이
 *     **admin 이상**(`isAtLeast`)이 아니면 `notFound()`(비관리자에게 존재 은닉). 위조 role 은 HMAC 차단.
 *   - admin·superadmin 공통 `AdminUsersPanel`(전체 유저 목록 + 승인/취소). 등급 드롭다운은
 *     **superadmin 만**(`canChangeRole`) — admin 은 등급 읽기 전용. 각 라우트가 등급별 재방어.
 *
 * `cookies()`(next/headers) 사용으로 요청별 동적 렌더 — 세션 신원을 서버에서 읽어 즉시 판정한다.
 */

import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { isAtLeast } from "@/lib/auth/roles";
import { AdminUsersPanel } from "@/components/admin/AdminUsersPanel";

export default async function AdminPage() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const identity = await readSession(token);
  if (!isAtLeast(identity?.role, "admin")) {
    notFound();
  }

  // 등급 변경(드롭다운)은 superadmin 만 — admin 은 승인/취소·등급 읽기 전용.
  return <AdminUsersPanel canChangeRole={isAtLeast(identity?.role, "superadmin")} />;
}
