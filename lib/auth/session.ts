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
} from "@/lib/auth/constants";

/** 서명된 세션 payload. 시각은 epoch **초**(JWT 관례 정합). */
export type SessionPayload = {
  /** payload 스키마 버전. */
  v: number;
  /** 발급 시각(epoch 초). */
  iat: number;
  /** 만료 시각(epoch 초). 만료의 단일 진실 — 서버가 항상 이 값을 본다. */
  exp: number;
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
 * 세션 토큰 검증 — 위조 차단(HMAC) + 만료 차단(exp).
 *
 * 1. `<body>.<sig>` 분해. 형식 불량이면 false.
 * 2. body 재서명 결과와 sig 를 constant-time 비교(타이밍 누출 차단).
 * 3. body 디코드 → `exp > now` 확인.
 * 위 모두 통과해야 true. `APP_AUTH_SECRET` 미설정·예외 시 false(안전 실패).
 */
export async function verifySession(
  token: string | undefined | null,
  nowMs: number = Date.now(),
): Promise<boolean> {
  if (!token) return false;
  const key = await importHmacKey();
  if (!key) return false;

  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return false;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  try {
    const expected = await hmacSign(key, body);
    // 서명 비교는 constant-time — 길이 다르면 false 지만 누출은 없다(둘 다 base64url 고정폭).
    if (!constantTimeEqual(sig, expected)) return false;

    const payload = decodePayload(body);
    if (!payload) return false;

    const now = Math.floor(nowMs / 1000);
    return payload.exp > now;
  } catch {
    // 디코드·crypto 예외는 전부 invalid 로 안전 실패.
    return false;
  }
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
