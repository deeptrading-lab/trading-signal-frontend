/**
 * `POST /api/admin/users/role` — 사용자 등급 변경(BFF, Node 런타임). **superadmin 전용.**
 *
 * body `{ sub, role }`. 가드: superadmin 만 · 유효 role · 대상 존재 · **마지막 superadmin 강등 금지**
 *   (자기 자신 포함 락아웃 방지 — 409). PRD user-login-auth Phase 2(3-tier 권한).
 */

import { NextRequest, NextResponse } from "next/server";
import { isValidRole } from "@/lib/auth/roles";
import { requireSuperadminApi } from "@/lib/server/auth/apiGuard";
import {
  countSuperadmins,
  getProfileBySub,
  setProfileRole,
} from "@/lib/server/auth/profileStore";
import type { ProfileRole } from "@/lib/types/auth/profile";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // live-role-check — 쿠키 role 이 아니라 DB 상 등급·승인상태를 대조한다(강등 즉시 반영).
  const denied = await requireSuperadminApi(request);
  if (denied) return denied;

  const body = await parseBody(request);
  if (!body) return json({ error: "invalid_request" }, 400);

  try {
    const target = await getProfileBySub(body.sub);
    if (!target) return json({ error: "not_found" }, 404);
    if (target.role === body.role) return json({ ok: true }, 200); // no-op

    // ★ 마지막 superadmin 강등 금지 — 자기 자신 포함 전체 락아웃 방지.
    if (target.role === "superadmin" && body.role !== "superadmin") {
      const count = await countSuperadmins();
      if (count <= 1) return json({ error: "last_superadmin" }, 409);
    }

    await setProfileRole(body.sub, body.role);
    return json({ ok: true }, 200);
  } catch (error) {
    console.error(
      "[admin] 등급 변경 실패",
      error instanceof Error ? error.message : String(error),
    );
    return json({ error: "profile_store_error" }, 500);
  }
}

/** body `{ sub, role }` — 유효 sub·role 이면 반환, 아니면 null. */
async function parseBody(
  request: NextRequest,
): Promise<{ sub: string; role: ProfileRole } | null> {
  try {
    const b = (await request.json()) as unknown;
    if (b && typeof b === "object") {
      const sub = (b as { sub?: unknown }).sub;
      const role = (b as { role?: unknown }).role;
      if (typeof sub === "string" && sub.trim() && isValidRole(role)) {
        return { sub: sub.trim(), role };
      }
    }
    return null;
  } catch {
    return null;
  }
}

function json(body: Record<string, unknown>, status: number): NextResponse {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
