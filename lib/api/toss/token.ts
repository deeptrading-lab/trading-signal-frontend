/**
 * 토스증권 access_token 발급 + 2단 캐시(L1 인스턴스 메모리 + L2 공유 store) + 분산 single-flight.
 *
 * PRD `toss-market-data-adapter` §3-1. 구조는 `lib/api/kis/token.ts` 와 대칭이되 한 가지가 다르다:
 *
 * ## ⚠️ 단일 활성 토큰 (스모크 실측 2026-07-02)
 *
 * 토스는 client_id 당 활성 토큰이 1개다 — **재발급 순간 기존 토큰이 즉시 401 무효**.
 * 따라서 토큰 캐시 주체가 둘 이상이면(로컬 dev+worker, Vercel 다인스턴스, 스모크 스크립트 병행)
 * 서로의 토큰을 죽이는 핑퐁이 난다. 대응 3겹:
 *   1. L2 공유 store(`getKisStore()` 재사용, `KIS_TOKEN_STORE=kv` 시 전 주체가 토큰 1개로 수렴).
 *   2. 분산 락 — 발급을 1주체로 수렴. 락 미획득 시 **직접 발급보다 폴링 대기를 우선**한다
 *      (KIS 와 달리 내가 발급하면 상대 토큰이 죽으므로 발급은 최후 수단).
 *   3. 그래도 외부 주체가 재발급해 내 토큰이 죽으면 → `invalidateTossToken()` + 호출측 1회 재시도
 *      (`client.ts` 의 401 처리)로 흡수.
 *
 * store 미설정(memory 기본)이면 L2 는 인스턴스 내 no-op — 단일 프로세스 로컬에선 그 자체로 충분.
 */

import axios from "axios";
import { getKisStore, hashAppKey } from "@/lib/api/kis/store";
import { makeTossTokenError } from "./errors";
import { delay } from "@/lib/server/bffUtils";

const TOKEN_URL = "https://openapi.tossinvest.com/oauth2/token";
const TOKEN_TIMEOUT_MS = 5_000;
/** 만료 60s 전부터 갱신 (KIS 와 동일 정책). */
const GRACE_PERIOD_MS = 60_000;
/** 분산 락 TTL — 데드락 방지. */
const LOCK_TTL_MS = 10_000;
/**
 * 락 미획득 시 store 폴링 — 단일 활성 토큰이라 KIS 보다 대기를 길게 갖는다
 * (성급한 직접 발급 = 락 보유자의 방금 발급한 토큰을 401 무효화하는 핑퐁).
 * 간격을 벌려 KV 왕복을 줄이고, 예산은 발급 소요(토큰 엔드포인트 ~1s)를 넉넉히 덮게.
 */
const POLL_INTERVAL_MS = 250;
const POLL_MAX_TOTAL_MS = 4_000;

type CacheEntry = {
  token: string;
  /** epoch ms — 이 시각 이전이면 fresh. */
  expiresAt: number;
};

let l1: CacheEntry | null = null;
let inflight: Promise<string> | null = null;

function readCreds(): { id: string; secret: string } | null {
  const id = process.env.TOSS_CLIENT_ID?.trim();
  const secret = process.env.TOSS_CLIENT_SECRET?.trim();
  if (!id || !secret) return null;
  return { id, secret };
}

/** store 키 — client_id 평문 금지(KIS appkey 해시 정책 답습). */
function storeKey(id: string): string {
  return `toss:token:${hashAppKey(id)}`;
}

function lockKey(id: string): string {
  return `toss:lock:token:${hashAppKey(id)}`;
}

function isFresh(entry: CacheEntry | null | undefined, now: number): entry is CacheEntry {
  return Boolean(entry && now < entry.expiresAt - GRACE_PERIOD_MS);
}

export async function getTossAccessToken(): Promise<string> {
  const creds = readCreds();
  if (!creds) throw makeTossTokenError();

  if (isFresh(l1, Date.now())) return l1.token;
  if (inflight) return inflight;

  inflight = acquireToken(creds).finally(() => {
    inflight = null;
  });
  return inflight;
}

async function acquireToken(creds: { id: string; secret: string }): Promise<string> {
  const store = getKisStore();
  const key = storeKey(creds.id);

  // L2 — 다른 주체가 이미 발급해 둔 토큰에 수렴(발급 = 상대 토큰 무효화이므로 최대한 재사용).
  const shared = await store.get<CacheEntry>(key);
  if (isFresh(shared, Date.now())) {
    l1 = shared;
    return shared.token;
  }

  const lockToken = await store.acquireLock(lockKey(creds.id), LOCK_TTL_MS);
  if (!lockToken) {
    // 다른 주체가 발급 중 — 폴링으로 그 토큰을 기다린다.
    const deadline = Date.now() + POLL_MAX_TOTAL_MS;
    while (Date.now() < deadline) {
      await delay(POLL_INTERVAL_MS);
      const polled = await store.get<CacheEntry>(key, 150);
      if (isFresh(polled, Date.now())) {
        l1 = polled;
        return polled.token;
      }
    }
    // 폴링 만료 — 가용성 우선 직접 발급(상대 토큰 무효화 감수, 401 재시도가 흡수).
  }

  try {
    const issued = await issueToken(creds);
    l1 = issued;
    const ttlSec = Math.max(60, Math.floor((issued.expiresAt - Date.now()) / 1000));
    await store.set(key, issued, ttlSec);
    return issued.token;
  } finally {
    if (lockToken) await store.releaseLock(lockKey(creds.id), lockToken);
  }
}

async function issueToken(creds: { id: string; secret: string }): Promise<CacheEntry> {
  let response;
  try {
    response = await axios.post(
      TOKEN_URL,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: creds.id,
        client_secret: creds.secret,
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: TOKEN_TIMEOUT_MS,
        validateStatus: (status) => status < 500,
      },
    );
  } catch (error) {
    throw makeTossTokenError({
      message:
        error instanceof Error
          ? `토스증권 토큰 발급 중 네트워크 오류가 발생했어요. (${error.message})`
          : undefined,
    });
  }

  const data = response.data as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (response.status !== 200 || !data?.access_token) {
    throw makeTossTokenError({
      status: response.status,
      detail: { error: data?.error, error_description: data?.error_description },
    });
  }

  const ttlMs =
    (typeof data.expires_in === "number" && data.expires_in > 0
      ? data.expires_in
      : 86_400) * 1_000;
  return { token: data.access_token, expiresAt: Date.now() + ttlMs };
}

/**
 * 401(invalid-token/expired-token) 수신 시 죽은 토큰 폐기 — 외부 주체 재발급으로 무효화된 케이스.
 *
 * @param deadToken 401 을 받은 그 토큰. L1/store 가 이미 다른(새) 토큰이면 건드리지 않는다
 *                  (직후 다른 주체가 발급한 fresh 토큰을 지우는 역효과 방지).
 */
export async function invalidateTossToken(deadToken: string): Promise<void> {
  if (l1?.token === deadToken) l1 = null;

  const creds = readCreds();
  if (!creds) return;
  const store = getKisStore();
  const key = storeKey(creds.id);
  const shared = await store.get<CacheEntry>(key);
  if (shared?.token === deadToken) {
    await store.del(key);
  }
}

/** 테스트 전용 — L1/inflight 초기화. */
export function resetTossTokenForTest(): void {
  l1 = null;
  inflight = null;
}
