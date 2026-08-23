/**
 * route handler(BFF)용 role 게이트 — admin 전용 데이터 API 가 직접 fetch/URL 로 새지 않게 방어.
 *
 * live-role-check: 등급 판정은 **쿠키가 아니라 DB** 를 본다(`resolveLiveIdentity`). 세션에는 발급
 *   시점 role 이 구워져 있어 강등·승인취소가 반영되지 않기 때문. 관리자 라우트는 저빈도라
 *   요청당 Supabase 1콜이 붙어도 무시할 만하다. 스토어 미설정(로컬 dev)이면 세션 값 폴백.
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
import { isVercelEnv } from "@/lib/server/env";
import {
  hasLivePrivilege,
  resolveLiveIdentity,
  type LiveIdentity,
} from "@/lib/server/auth/liveRole";
import type { ProfileRole } from "@/lib/types/auth/profile";

function forbidden(): NextResponse {
  return NextResponse.json(
    { error: "forbidden" },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}

/** 요청 쿠키의 세션을 DB 와 대조한 신원. 거부 대상이면 null. */
async function liveIdentityOf(request: NextRequest): Promise<LiveIdentity | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return resolveLiveIdentity(await readSession(token));
}

async function hasRequestPrivilege(
  request: NextRequest,
  required: ProfileRole,
): Promise<boolean> {
  return hasLivePrivilege(await liveIdentityOf(request), required);
}

/** admin 미만이면 403, 아니면 null(통과). **환경 무관 admin+ 전용**(예: 성적표·A/B 리포트). */
export async function requireAdminApi(
  request: NextRequest,
): Promise<NextResponse | null> {
  return (await hasRequestPrivilege(request, "admin")) ? null : forbidden();
}

/**
 * **prod(Vercel)에서만** admin+ 요구, 로컬은 통과. `/intraday` 페이지 게이트 규칙과 정합
 * (로컬 dev 무마찰 유지 — 로컬은 세션 없이도/일반 등급도 사용, prod 만 admin 제한).
 * (`/analyze` 는 analyze-open-access 로 개방 — decisions 목록은 가드 없음, usage 만 본 가드 유지.)
 */
export async function requireProdAdminApi(
  request: NextRequest,
): Promise<NextResponse | null> {
  if (!isVercelEnv()) return null;
  return (await hasRequestPrivilege(request, "admin")) ? null : forbidden();
}

/**
 * **prod(Vercel)에서만** 로그인 요구(등급 무관), 로컬은 통과 — 분석 실행처럼 "미로그인은 못 하게"
 * 막되 로컬 dev 무마찰은 유지해야 하는 쓰기 경로용. 로컬 워커/봇도 localhost 호출이라 통과한다.
 * 401(403 아님) — 클라이언트 axios 인터셉터가 세션 만료와 같은 방식으로 `/login` 유도.
 */
export async function requireProdSessionApi(
  request: NextRequest,
): Promise<NextResponse | null> {
  if (!isVercelEnv()) return null;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (await readSession(token)) return null;
  return NextResponse.json(
    { error: "unauthorized" },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * 요청 쿠키의 세션 이메일(소문자 정규화). 미로그인·서명 불일치·미설정이면 null.
 * analyze-owner-filter — "내가 분석한 종목만" 필터의 신원 출처. 가드가 아니라 **귀속용**이라
 * null 이어도 요청을 막지 않는다(로컬 dev 무마찰 = 필터 없음).
 */
export async function sessionEmail(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return (await readSession(token))?.email ?? null;
}

/** superadmin 미만이면 403(환경 무관) — **파괴적 작업**(저장 분석 결과 삭제 등) 전용 최상위 가드. */
export async function requireSuperadminApi(
  request: NextRequest,
): Promise<NextResponse | null> {
  return (await hasRequestPrivilege(request, "superadmin")) ? null : forbidden();
}
