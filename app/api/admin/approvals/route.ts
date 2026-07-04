/**
 * `/api/admin/approvals` — 승인 대기 관리(BFF, Node 런타임).
 *   - `GET`  → 대기(`pending`) 목록.
 *   - `POST {sub}` → 해당 사용자 `approved` 전환.
 *
 * PRD user-login-auth §3.7 / AC-10 / AC-11:
 *   게이트(`proxy.ts`)는 role 을 보지 않으므로(네트워크 I/O 0), **이 라우트가 직접 role 을 방어**한다.
 *   세션 신원(`readSession`)의 `role === "admin"` 이 아니면 403. 위조 role 은 HMAC 검증에서 걸러진다.
 *   스토어 오류는 500(fail-open 금지, AC-16 계승).
 */

import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
  listPendingProfiles,
  setProfileStatus,
} from "@/lib/server/auth/profileStore";

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

  const sub = await readSub(request);
  if (!sub) {
    return NextResponse.json(
      { error: "invalid_request" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    await setProfileStatus(sub, "approved");
    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return storeError("승인 처리", error);
  }
}

/** role==admin 자체 검증 — 미달이면 403 응답 반환(통과면 null). */
async function guardAdmin(request: NextRequest): Promise<NextResponse | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const identity = await readSession(token);
  if (!identity || identity.role !== "admin") {
    return NextResponse.json(
      { error: "forbidden" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  return null;
}

/** body `{ sub }` 에서 문자열 sub 추출. 형식 불량이면 null. */
async function readSub(request: NextRequest): Promise<string | null> {
  try {
    const body = (await request.json()) as unknown;
    if (
      body &&
      typeof body === "object" &&
      typeof (body as { sub?: unknown }).sub === "string" &&
      (body as { sub: string }).sub.trim()
    ) {
      return (body as { sub: string }).sub.trim();
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
