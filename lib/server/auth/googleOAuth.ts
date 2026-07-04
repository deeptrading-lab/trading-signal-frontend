/**
 * Google OAuth 2.0 Authorization Code flow 유틸 — 서버 전용(Node 런타임 route handler 에서만).
 *
 * PRD user-login-auth §3.3 / §9 q1=C(수동 code flow, 의존 0). `client_secret` 을 쓰는 토큰 교환이
 * 여기 있으므로 **`proxy.ts`(Edge) import 그래프에 절대 넣지 않는다**(§8.4 Edge 오염 금지).
 * 게이트는 OAuth 구성 여부를 env 만 읽어 판정하고 본 모듈을 import 하지 않는다.
 *
 * - authorize URL 생성 + state(CSRF·next 동봉) 생성/대조.
 * - code → Google 토큰 엔드포인트 **서버측 교환** → id_token 클레임에서 검증된 이메일/sub 추출.
 *   `email_verified === true` 인 신원만 반환한다(AC-18).
 */

const GOOGLE_AUTHORIZE_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
/** 토큰 교환 타임아웃(ms) — Google 지연 시 콜백이 무한정 걸리지 않게. */
const TOKEN_EXCHANGE_TIMEOUT_MS = 10_000;

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

/** 검증된 Google 신원 — 교환 성공 시 반환. */
export type GoogleIdentity = {
  sub: string;
  email: string;
  displayName: string | null;
};

export type OAuthIdentityResult =
  | { ok: true; identity: GoogleIdentity }
  | { ok: false; reason: "exchange_failed" | "invalid_token" | "email_unverified" };

/** id_token(JWT) payload 클레임 — 우리가 신뢰하는 최소 필드. */
type GoogleIdClaims = {
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  aud?: string;
};

/**
 * env 3종(`GOOGLE_OAUTH_CLIENT_ID`·`_CLIENT_SECRET`·`_REDIRECT_URI`)이 모두 있으면 config, 아니면 null.
 * ⚠️ 모두 서버 전용 — `NEXT_PUBLIC_` 접두 금지(client_secret 노출 방지).
 */
export function googleOAuthConfig(): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

/** OAuth 구성 여부(라우트용). ⚠️ 게이트(proxy)는 본 모듈을 import 하지 말 것 — env 를 직접 읽는다. */
export function isGoogleOAuthConfigured(): boolean {
  return googleOAuthConfig() !== null;
}

/**
 * open-redirect 방지 — `next` 는 same-origin 절대경로(`/` 시작, `//` 불허)만 허용, 그 외 `/`.
 * proxy 의 `safeNextPath` 와 동일 규칙(단일 경로 문자열 버전).
 */
export function sanitizeNextPath(next: string | undefined | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

/**
 * authorize URL 생성. scope `openid email profile`(online only — refresh 미요청),
 * `prompt=select_account`(계정 고정 방지), redirect_uri 는 env 고정값(정확 일치).
 */
export function buildAuthorizeUrl(config: GoogleOAuthConfig, state: string): string {
  const url = new URL(GOOGLE_AUTHORIZE_ENDPOINT);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("access_type", "online");
  return url.toString();
}

/**
 * state 생성 — URL 에 실을 nonce + 쿠키에 실을 값(nonce+next 를 base64url(JSON)).
 * 콜백은 쿠키의 nonce 와 URL 의 state 를 대조(일치해야 통과), next 는 쿠키에서 꺼낸다.
 */
export function createOAuthState(next: string): {
  urlState: string;
  cookieValue: string;
} {
  const nonce = randomToken(16);
  const cookieValue = base64UrlEncode(
    JSON.stringify({ n: nonce, next: sanitizeNextPath(next) }),
  );
  return { urlState: nonce, cookieValue };
}

/**
 * 콜백에서 state 대조 — 쿠키 nonce 와 URL state 가 일치하면 valid + 안전한 next 반환.
 * 불일치·쿠키 부재·형식 불량이면 invalid(→ 콜백이 400, AC-19).
 */
export function parseOAuthState(
  cookieValue: string | undefined | null,
  urlState: string | null | undefined,
): { valid: boolean; next: string } {
  if (!cookieValue || !urlState) return { valid: false, next: "/" };
  try {
    const decoded = JSON.parse(base64UrlDecode(cookieValue)) as {
      n?: string;
      next?: string;
    };
    if (!decoded.n || decoded.n !== urlState) return { valid: false, next: "/" };
    return { valid: true, next: sanitizeNextPath(decoded.next) };
  } catch {
    return { valid: false, next: "/" };
  }
}

/**
 * code 를 Google 토큰 엔드포인트에 **서버측 교환**(client_secret) → 검증된 신원 반환.
 * `email_verified === true` 인 신원만 `ok`. 실패는 사유별 결과(콜백이 리다이렉트로 매핑).
 */
export async function exchangeCodeForIdentity(
  config: GoogleOAuthConfig,
  code: string,
): Promise<OAuthIdentityResult> {
  let res: Response;
  try {
    res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }).toString(),
      cache: "no-store",
      signal: AbortSignal.timeout(TOKEN_EXCHANGE_TIMEOUT_MS),
    });
  } catch (error) {
    console.warn("[auth] Google 토큰 교환 네트워크 오류", errMessage(error));
    return { ok: false, reason: "exchange_failed" };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn(`[auth] Google 토큰 교환 실패 status=${res.status} ${text}`);
    return { ok: false, reason: "exchange_failed" };
  }

  const token = (await res.json().catch(() => null)) as { id_token?: string } | null;
  if (!token?.id_token) return { ok: false, reason: "exchange_failed" };

  const claims = decodeIdTokenClaims(token.id_token);
  if (!claims?.sub || !claims.email) return { ok: false, reason: "invalid_token" };

  // aud 방어 — 우리 client 로 발급된 토큰만 신뢰(토큰 오배송 차단).
  if (claims.aud && claims.aud !== config.clientId) {
    return { ok: false, reason: "invalid_token" };
  }

  // 검증된 이메일만 신뢰(AC-18). Google id_token 은 boolean, 일부 경로는 문자열 "true".
  const verified = claims.email_verified === true || claims.email_verified === "true";
  if (!verified) return { ok: false, reason: "email_unverified" };

  return {
    ok: true,
    identity: {
      sub: claims.sub,
      email: claims.email.trim().toLowerCase(),
      displayName: claims.name?.trim() || null,
    },
  };
}

/* -------------------------------------------------------------------------- */

/**
 * id_token(JWT) payload 세그먼트 디코드. **서명 검증은 생략** — 토큰을 Google 토큰 엔드포인트에서
 * TLS 서버-서버로 직접 수령했으므로 채널이 신뢰원(Google 공식 가이드 허용). 형식 불량이면 null.
 */
function decodeIdTokenClaims(idToken: string): GoogleIdClaims | null {
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(base64UrlDecode(parts[1])) as GoogleIdClaims;
  } catch {
    return null;
  }
}

/** 랜덤 hex 토큰(Web Crypto — Edge·Node 공용). bytes 바이트 → 2배 길이 hex. */
function randomToken(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** 본 모듈은 Node 런타임 route 전용이라 Buffer base64url 사용(간결). */
function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function errMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
