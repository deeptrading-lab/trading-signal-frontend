/**
 * 루트 middleware — 앱 전체 단일 공유 비밀번호 게이트 (Edge 런타임).
 *
 * PRD `app-password-gate` §3.1 / AC-1~4 / AC-13:
 *   - 게이트 활성 조건: `process.env.APP_PASSWORD` truthy 일 때만. 미설정이면 통과(앱 공개).
 *     `NODE_ENV==="production"` + 미설정이면 경고 로그 1회(모듈 로드 시점, 요청마다 스팸 금지).
 *   - 세션 쿠키(`app_auth`) 를 `verifySession`(HMAC + exp) 으로 검증. 유효하면 통과.
 *   - 미인증 분기:
 *       · 페이지 → `/login?next=<원경로>` 307 리다이렉트(next 는 same-origin 절대경로만, open-redirect 차단).
 *       · `/api/*`(인증 API 제외) → 401 JSON `{ error: "unauthorized" }`(리다이렉트 X, axios 친화).
 *   - 예외(항상 통과): `/login`, `/api/auth/*`, `/_next/static`, `/_next/image`, favicon/icon,
 *     메타 라우트, `/fonts/*` 공개 에셋. **matcher + 코드 가드 이중**.
 *   - 무한 리다이렉트 루프 가드: 이미 `/login` 이거나 예외 경로면 절대 다시 리다이렉트하지 않는다.
 *
 * Edge 호환 — Node `crypto`/`Buffer` 미사용. cookie 파싱 + 분기만, 서명 검증은 `lib/auth/session` 위임.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

/**
 * 알려진 소셜/검색 크롤러 User-Agent 화이트리스트 (소문자, 부분일치).
 * PRD social-share-metadata §3.4 / §9 q1 = 옵션 B — 게이트가 켜진 prod 에서도 카톡/SNS 크롤러가
 * OG 메타·이미지를 읽을 수 있게 "미인증 페이지 + OG 이미지 라우트"에 한해 게이트를 통과시킨다.
 *
 * ⚠️ OG 크롤러 한정 예외 — `/api/*` 는 본 화이트리스트와 무관하게 항상 차단해 데이터 보호를 유지한다.
 *    UA 는 위조 가능하나 본 게이트는 강보안이 아니라 "공개 노출 최소화"가 목적(app-password-gate §4 RBAC 비범위).
 *    UA 위조자가 얻는 건 빈 UI 셸 + OG <meta> 뿐 — 실데이터는 전부 게이트된 `/api/*`(쿠키 없으면 401)로 보호된다.
 */
const CRAWLER_USER_AGENTS = [
  "kakaotalk-scrap", // 카카오톡 링크 스크랩
  "facebookexternalhit", // 페이스북
  "facebot", // 페이스북
  "twitterbot", // X(트위터)
  "slackbot", // 슬랙
  "discordbot", // 디스코드
  "telegrambot", // 텔레그램
  "linkedinbot", // 링크드인
  "whatsapp", // 왓츠앱
  "googlebot", // 구글
  "bingbot", // 빙
];

/** 요청 UA 가 알려진 OG 크롤러인지(대소문자 무시 부분일치). */
function isCrawlerUserAgent(request: NextRequest): boolean {
  const ua = request.headers.get("user-agent")?.toLowerCase() ?? "";
  if (!ua) return false;
  return CRAWLER_USER_AGENTS.some((needle) => ua.includes(needle));
}

/**
 * 인증 없이 항상 통과하는 예외 경로 판별(코드 가드 — matcher 와 이중 방어).
 * matcher 가 1차 제외하더라도 보안 경계는 본 함수가 단일 진실.
 */
function isPublicPath(pathname: string): boolean {
  // 로그인 화면 자체 — 루프 가드의 핵심.
  if (pathname === "/login") return true;
  // 인증 API(login/logout) — 미인증 상태에서 호출 가능해야 한다.
  if (pathname.startsWith("/api/auth/")) return true;
  // Next 정적/이미지 자원.
  if (pathname.startsWith("/_next/static")) return true;
  if (pathname.startsWith("/_next/image")) return true;
  // favicon / app icon / 메타 라우트.
  if (
    pathname === "/favicon.ico" ||
    pathname === "/icon" ||
    pathname.startsWith("/icon") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.webmanifest"
  ) {
    return true;
  }
  // public/ 공개 에셋(폰트 등).
  if (pathname.startsWith("/fonts/")) return true;
  return false;
}

/** `/api/*` 요청인지(401 JSON 분기 대상). 인증 API 는 위 isPublicPath 가 이미 통과시킴. */
function isApiRequest(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

/**
 * open-redirect 방지 — `next` 는 same-origin 절대경로(`/` 시작, `//` 불허)만 허용.
 * 그 외엔 `/` 로 폴백. 로그인 성공 후 외부 도메인으로 새지 않게.
 */
function safeNextPath(pathname: string, search: string): string {
  const candidate = `${pathname}${search}`;
  if (!candidate.startsWith("/")) return "/";
  if (candidate.startsWith("//")) return "/";
  return candidate;
}

export async function middleware(request: NextRequest) {
  // 게이트 비활성(비밀번호 미설정) → 즉시 통과(앱 공개). 로컬/CI 마찰 0.
  if (!process.env.APP_PASSWORD) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;

  // 예외 화이트리스트 — 항상 통과(루프 가드 포함: /login·/api/auth/* 는 여기서 통과).
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // 세션 쿠키 검증(HMAC + exp). 유효하면 통과.
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const valid = await verifySession(token);
  if (valid) {
    return NextResponse.next();
  }

  // 미인증 — API 는 401 JSON, 페이지는 /login 리다이렉트.
  // ⚠️ `/api/*` 는 크롤러 UA 라도 여기서 먼저 401 — 데이터 보호 불변(아래 UA 예외보다 앞).
  if (isApiRequest(pathname)) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  // OG 크롤러 예외(옵션 B) — 페이지(+`/opengraph-image`) 한정으로 게이트 통과(노출되는 건 빈 UI 셸 + OG <meta> 뿐).
  // `/api/*` 는 위에서 이미 401 처리되므로 본 분기는 페이지 요청만 통과시킨다(데이터 보호 유지). 상세 근거는 CRAWLER_USER_AGENTS 주석.
  // 크롤러는 GET/HEAD 로만 OG 를 읽는다 — 그 외 메서드는 통과 불허(PRD §9 q1(2) 'GET 페이지 한정' 정합).
  // HEAD 도 허용: 일부 크롤러·`curl -sI`(OG content-type 검증) 가 HEAD 를 보내므로 GET 만 허용하면 /login 으로 샌다.
  if (
    ["GET", "HEAD"].includes(request.method) &&
    isCrawlerUserAgent(request)
  ) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", safeNextPath(pathname, search));
  return NextResponse.redirect(loginUrl, 307);
}

/**
 * 1차 성능 제외(부하 절감) — 정적/이미지/favicon/icon/fonts.
 * ⚠️ 보안 경계는 위 미들웨어 함수 내부 `isPublicPath` 가 단일 진실(matcher 는 최적화일 뿐).
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|fonts).*)"],
};

/* 프로덕션 + 비밀번호 미설정 경고 — 모듈 로드 시 1회(요청마다 스팸 금지, AC-13). */
if (process.env.NODE_ENV === "production" && !process.env.APP_PASSWORD) {
  console.warn(
    "[auth] APP_PASSWORD 미설정 — 프로덕션에서 앱 게이트가 비활성입니다(앱 공개). Vercel 환경변수에 APP_PASSWORD/APP_AUTH_SECRET 를 설정하세요.",
  );
}
