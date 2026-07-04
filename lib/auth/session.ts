/**
 * 세션 토큰 서명/검증 — Web Crypto HMAC-SHA256 (Edge 호환).
 *
 * PRD `app-password-gate` §3.2 / AC-8 / AC-10 / AC-11:
 *   - middleware(Edge 런타임)·route handler 양쪽에서 공유 → Node `crypto`/`Buffer` 금지.
 *     `crypto.subtle`(Web Crypto) + `TextEncoder`/`Uint8Array` 만 사용.
 *   - 토큰 형식: `<base64url(payload)>.<base64url(hmac)>` (JWT 유사, 라이브러리 없이 직접).
 *   - 서명: payload `{ v, iat, exp }` 를 JSON→base64url 한 body 를 `APP_AUTH_SECRET` 로 HMAC.
 *   - 검증: (1) body 재서명 결과와 sig 를 constant-time 비교(위조 차단) →
 *           (2) payload `exp > now` 확인(만료 차단). 둘 다 통과해야 유효.
 *   - 만료의 단일 진실은 서명된 payload `exp` — 쿠키 maxAge 만 신뢰하지 않는다(AC-8).
 *   - 시크릿 부재 가드: `APP_AUTH_SECRET` 미설정 시 서명 발급 거부 / 검증 false(안전 실패).
 *
 * base64url 은 `atob`/`btoa`(Edge·브라우저·Node 공통) 로 구현 — Node `Buffer` 미사용.
 */

import {
  SESSION_MAX_AGE_SECONDS,
  SESSION_TOKEN_VERSION,
  SESSION_TOKEN_VERSION_IDENTITY,
} from "@/lib/auth/constants";
import type { ProfileRole } from "@/lib/types/auth/profile";

/** 세션에 굽는 역할 — 프로필 역할과 동일 union(단일 진실). */
export type SessionRole = ProfileRole;

/**
 * 서명된 세션 payload. 시각은 epoch **초**(JWT 관례 정합).
 *
 * 신원 필드(`sub`/`email`/`role`)는 **선택** — `v=1`(비밀번호) 토큰은 없고, `v=2`(Google 로그인)
 * 토큰만 채운다. `verifySession` 은 이 필드를 보지 않으므로 두 버전 모두 유효하다(하위호환, AC-5).
 */
export type SessionPayload = {
  /** payload 스키마 버전. 1=비밀번호, 2=신원(Google). */
  v: number;
  /** 발급 시각(epoch 초). */
  iat: number;
  /** 만료 시각(epoch 초). 만료의 단일 진실 — 서버가 항상 이 값을 본다. */
  exp: number;
  /** Google 안정 식별자(신원 세션만). */
  sub?: string;
  /** 소문자 정규화 이메일(신원 세션만). */
  email?: string;
  /** 역할(신원 세션만) — role 방어 라우트가 `readSession` 으로 읽는다. */
  role?: SessionRole;
};

/** 디코드된 신원 — `readSession` 반환. 서명·만료 검증 통과분만 반환된다. */
export type SessionIdentity = {
  v: number;
  sub?: string;
  email?: string;
  role?: SessionRole;
};

const textEncoder = new TextEncoder();

/**
 * `APP_AUTH_SECRET` 으로 HMAC-SHA256 CryptoKey 를 import.
 * 미설정 시 null — 호출 측이 안전 실패(서명 거부 / 검증 false)하도록 한다.
 */
async function importHmacKey(): Promise<CryptoKey | null> {
  const secret = process.env.APP_AUTH_SECRET;
  if (!secret) return null;
  return crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

/** body 문자열을 HMAC-SHA256 서명 → base64url 문자열. */
async function hmacSign(key: CryptoKey, body: string): Promise<string> {
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(body));
  return bytesToBase64Url(new Uint8Array(signature));
}

/**
 * 세션 토큰 발급. payload `exp = iat + 30일`.
 *
 * @returns `<body>.<sig>` 토큰. `APP_AUTH_SECRET` 미설정 시 null(발급 거부).
 */
export async function signSession(nowMs: number = Date.now()): Promise<string | null> {
  const key = await importHmacKey();
  if (!key) return null;

  const iat = Math.floor(nowMs / 1000);
  const payload: SessionPayload = {
    v: SESSION_TOKEN_VERSION,
    iat,
    exp: iat + SESSION_MAX_AGE_SECONDS,
  };
  const body = bytesToBase64Url(textEncoder.encode(JSON.stringify(payload)));
  const sig = await hmacSign(key, body);
  return `${body}.${sig}`;
}

/**
 * 신원(Google 로그인) 세션 토큰 발급 — `v=2`, payload 에 `sub`/`email`/`role` 포함.
 *
 * 승인(`approved`)된 사용자에게만 발급한다(콜백 라우트가 분기). `verifySession` 시맨틱은 불변
 * (유효 서명 + 미만료 = true) — 신원은 부가 payload 이고 게이트는 boolean 만 본다.
 *
 * @returns `<body>.<sig>` 토큰. `APP_AUTH_SECRET` 미설정 시 null(발급 거부).
 */
export async function signIdentitySession(
  identity: { sub: string; email: string; role: SessionRole },
  nowMs: number = Date.now(),
): Promise<string | null> {
  const key = await importHmacKey();
  if (!key) return null;

  const iat = Math.floor(nowMs / 1000);
  const payload: SessionPayload = {
    v: SESSION_TOKEN_VERSION_IDENTITY,
    iat,
    exp: iat + SESSION_MAX_AGE_SECONDS,
    sub: identity.sub,
    email: identity.email,
    role: identity.role,
  };
  const body = bytesToBase64Url(textEncoder.encode(JSON.stringify(payload)));
  const sig = await hmacSign(key, body);
  return `${body}.${sig}`;
}

/**
 * 토큰을 검증(HMAC + exp)하고 payload 를 반환한다. 실패(위조·만료·형식 불량·시크릿 부재·예외)면 null.
 * `verifySession`(boolean)·`readSession`(신원) 공통 코어 — 검증 로직 단일화.
 *
 * 1. `<body>.<sig>` 분해. 형식 불량이면 null.
 * 2. body 재서명 결과와 sig 를 constant-time 비교(타이밍 누출 차단).
 * 3. body 디코드 → `exp > now` 확인.
 */
async function verifyAndDecode(
  token: string | undefined | null,
  nowMs: number,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const key = await importHmacKey();
  if (!key) return null;

  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  try {
    const expected = await hmacSign(key, body);
    // 서명 비교는 constant-time — 길이 다르면 false 지만 누출은 없다(둘 다 base64url 고정폭).
    if (!constantTimeEqual(sig, expected)) return null;

    const payload = decodePayload(body);
    if (!payload) return null;

    const now = Math.floor(nowMs / 1000);
    if (payload.exp <= now) return null;
    return payload;
  } catch {
    // 디코드·crypto 예외는 전부 invalid 로 안전 실패.
    return null;
  }
}

/**
 * 세션 토큰 검증 — 위조 차단(HMAC) + 만료 차단(exp). 모두 통과해야 true.
 *
 * `APP_AUTH_SECRET` 미설정·예외 시 false(안전 실패). **시맨틱 불변** — 게이트(`proxy.ts`)가
 * 네트워크 I/O 없이 이 boolean 만으로 판정한다(role 조회 금지, AC-15). `v=1`(비밀번호)·`v=2`(신원)
 * 토큰 모두 유효 서명 + 미만료면 통과(폴백 공존, AC-5).
 */
export async function verifySession(
  token: string | undefined | null,
  nowMs: number = Date.now(),
): Promise<boolean> {
  return (await verifyAndDecode(token, nowMs)) !== null;
}

/**
 * 검증된 토큰의 신원(`sub`/`email`/`role`)을 반환한다. 위조·만료·형식 불량이면 null(안전 실패).
 *
 * role 방어가 필요한 라우트(예: `/api/admin/approvals`)가 `role === "admin"` 을 스스로 확인하는 용도.
 * 서명을 반드시 검증한 뒤 신원을 돌려주므로, 위조된 `role=admin` 쿠키는 통과하지 못한다.
 * 순수 함수(Web Crypto·JSON) — Edge·Node 공용. **단, `proxy.ts` 는 호출하지 않는다**(게이트는 boolean만).
 */
export async function readSession(
  token: string | undefined | null,
  nowMs: number = Date.now(),
): Promise<SessionIdentity | null> {
  const payload = await verifyAndDecode(token, nowMs);
  if (!payload) return null;
  return {
    v: payload.v,
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
  };
}

/** base64url(JSON) body 를 `SessionPayload` 로 디코드. 형식 불량이면 null. */
function decodePayload(body: string): SessionPayload | null {
  try {
    const json = base64UrlToString(body);
    const parsed = JSON.parse(json) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as SessionPayload).exp === "number" &&
      typeof (parsed as SessionPayload).iat === "number"
    ) {
      return parsed as SessionPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/* ----------------------------------------------------------------------------
 * constant-time 비교
 * --------------------------------------------------------------------------*/

/**
 * 두 ASCII 문자열을 **상수 시간**으로 비교한다(타이밍 공격 방지, AC-11).
 *
 * - 길이가 다르면 early-return 으로 false 를 반환하되 누적 XOR 도 함께 더럽혀
 *   "길이 일치 + 내용 불일치" 와 분기 형태를 통일한다(길이 자체는 base64url 고정폭이라 비밀 아님).
 * - 내용 비교는 OR 누적으로 첫 불일치에서 끊지 않는다(early-return on mismatch 없음).
 */
function constantTimeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    // 범위를 벗어나면 0 — 길이 차이는 위 diff 초기값이 이미 반영.
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}

/* ----------------------------------------------------------------------------
 * base64url (Node Buffer 미사용 — Edge 호환)
 * --------------------------------------------------------------------------*/

/** Uint8Array → base64url(`+/=` 제거, `-_` 치환). */
function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** base64url → UTF-8 문자열. */
function base64UrlToString(value: string): string {
  const padded = padBase64(value.replace(/-/g, "+").replace(/_/g, "/"));
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/** base64 패딩(`=`) 복원 — atob 가 패딩을 요구. */
function padBase64(value: string): string {
  const remainder = value.length % 4;
  if (remainder === 0) return value;
  return value + "=".repeat(4 - remainder);
}
