/**
 * `/api/admin/approvals` — 승인 관리(BFF, Node 런타임).
 *   - `GET`  → 대기(`pending`) 목록.
 *   - `POST {sub, status?}` → 상태 전환. status 미지정=`approved`(승인, 하위호환), `"pending"`=취소(revoke).
 *
 * PRD user-login-auth §3.7 / Phase 2:
 *   게이트(`proxy.ts`)는 role 을 보지 않으므로 **이 라우트가 직접 role 을 방어**한다.
 *   **DB 상 등급**이 admin 이상(admin·superadmin)이 아니면 403(live-role-check).
 *   위조 role 은 HMAC 검증에서 걸러진다. 스토어 오류는 500(fail-open 금지).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/server/auth/apiGuard";
import {
  listPendingProfiles,
  setProfileStatus,
} from "@/lib/server/auth/profileStore";
import type { ProfileStatus } from "@/lib/types/auth/profile";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const denied = await guardAdmin(request);
  if (denied) return denied;

  try {
    const profiles = await listPendingProfiles();
    return NextResponse.json(
      { profiles },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return storeError("대기목록 조회", error);
  }
}

export async function POST(request: NextRequest) {
  const denied = await guardAdmin(request);
  if (denied) return denied;

  const body = await readBody(request);
  if (!body) {
    return NextResponse.json(
      { error: "invalid_request" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    await setProfileStatus(body.sub, body.status);
    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return storeError("상태 전환", error);
  }
}

/**
 * role **admin 이상** 검증(superadmin 포함) — 미달이면 403(통과면 null).
 * live-role-check — 공용 가드가 DB 상 등급·승인상태를 대조한다(쿠키 role 불신).
 */
async function guardAdmin(request: NextRequest): Promise<NextResponse | null> {
  return requireAdminApi(request);
}

/** body `{ sub, status? }` — status 미지정/불량이면 `approved`(하위호환). */
async function readBody(
  request: NextRequest,
): Promise<{ sub: string; status: ProfileStatus } | null> {
  try {
    const b = (await request.json()) as unknown;
    if (b && typeof b === "object") {
      const sub = (b as { sub?: unknown }).sub;
      if (typeof sub === "string" && sub.trim()) {
        const raw = (b as { status?: unknown }).status;
        const status: ProfileStatus = raw === "pending" ? "pending" : "approved";
        return { sub: sub.trim(), status };
      }
    }
    return null;
  } catch {
    return null;
  }
}

function storeError(context: string, error: unknown): NextResponse {
  console.error(
    `[admin] ${context} 실패`,
    error instanceof Error ? error.message : String(error),
  );
  return NextResponse.json(
    { error: "profile_store_error" },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}
