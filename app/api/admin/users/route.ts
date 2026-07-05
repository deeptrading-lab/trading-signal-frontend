/**
 * `GET /api/admin/users` — 전체 사용자 목록(BFF, Node 런타임). **superadmin 전용.**
 *
 * PRD user-login-auth Phase 2(3-tier 권한 — 유저 관리). 게이트는 role 을 안 보므로 라우트가
 * 직접 방어한다: `readSession` 이 **superadmin** 이 아니면 403(위계 `isAtLeast`). 스토어 오류 500.
 */

import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { isAtLeast } from "@/lib/auth/roles";
import { listAllProfiles } from "@/lib/server/auth/profileStore";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const identity = await readSession(token);
  if (!isAtLeast(identity?.role, "superadmin")) {
    return NextResponse.json(
      { error: "forbidden" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

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
