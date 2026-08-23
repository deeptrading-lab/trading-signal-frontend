/**
 * `GET /api/admin/users` — 전체 사용자 목록(BFF, Node 런타임). **superadmin 전용.**
 *
 * PRD user-login-auth Phase 2(3-tier 권한 — 유저 관리). 게이트는 role 을 안 보므로 라우트가
 * 직접 방어한다: 공용 가드(`requireAdminApi`)가 **DB 상 등급**을 대조해 미달이면 403. 스토어 오류 500.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/server/auth/apiGuard";
import { listAllProfiles } from "@/lib/server/auth/profileStore";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // 전체 목록 조회는 **admin 이상**(admin 은 읽기·승인만, 등급 변경은 superadmin 전용 /users/role).
  // live-role-check — 공용 가드가 DB 상 등급·승인상태를 대조한다(쿠키 role 불신).
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const profiles = await listAllProfiles();
    return NextResponse.json(
      { profiles },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "[admin] 전체 목록 조회 실패",
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json(
      { error: "profile_store_error" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
