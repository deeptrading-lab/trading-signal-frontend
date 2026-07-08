/**
 * route handler(BFF)용 role 게이트 — admin 전용 데이터 API 가 직접 fetch/URL 로 새지 않게 방어.
 *
 * Edge proxy 게이트(`proxy.ts`)는 로그인 여부만 보고 role 은 안 보므로(설계상), admin 전용 데이터
 * 라우트는 각자 이 헬퍼로 방어한다. 페이지용 `lib/auth/serverGuard`(`cookies()` next/headers 기반)와
 * 달리 route handler 는 `NextRequest.cookies` 를 쓴다. `readSession` 이 HMAC 서명을 검증하므로
 * 위조 role 쿠키는 통과하지 못한다. 403 형태는 `/api/admin/*` 기존 패턴과 정합(`{error:"forbidden"}`).
 *
 * 사용:
 *   export async function GET(request: NextRequest) {
 *     const denied = await requireAdminApi(request);   // 또는 requireProdAdminApi
 *     if (denied) return denied;
 *     ...
 *   }
 *
 * 내부(cron/스케줄러/워커)는 이 라우트들을 HTTP 로 부르지 않고 `lib/server` 함수를 직접 import 하므로
 * (전수조사 확인), 게이트를 걸어도 내부 동작에 영향 없다(서비스 토큰 우회 불필요).
 */

import { NextResponse, type NextRequest } from "next/server";
import { readSession } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { isAtLeast } from "@/lib/auth/roles";
import { isVercelEnv } from "@/lib/server/env";

function forbidden(): NextResponse {
  return NextResponse.json(
    { error: "forbidden" },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}

async function isAdminRequest(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const identity = await readSession(token);
  return isAtLeast(identity?.role, "admin");
}

/** admin 미만이면 403, 아니면 null(통과). **환경 무관 admin+ 전용**(예: 성적표·A/B 리포트). */
export async function requireAdminApi(
  request: NextRequest,
): Promise<NextResponse | null> {
  return (await isAdminRequest(request)) ? null : forbidden();
}

/**
 * **prod(Vercel)에서만** admin+ 요구, 로컬은 통과. `/intraday`·`/analyze` 페이지 게이트 규칙과 정합
 * (로컬 dev 무마찰 유지 — 로컬은 세션 없이도/일반 등급도 사용, prod 만 admin 제한).
 */
export async function requireProdAdminApi(
  request: NextRequest,
): Promise<NextResponse | null> {
  if (!isVercelEnv()) return null;
  return (await isAdminRequest(request)) ? null : forbidden();
}
