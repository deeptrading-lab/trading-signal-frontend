/**
 * KIS access_token 발급 + 캐시 + 갱신 + single-flight.
 *
 * PRD `stock-api-integration` §6.2, AC-6 — 다음 4개 동작 의무:
 *   1. 첫 호출 → POST /oauth2/tokenP 1회.
 *   2. 두 번째 호출 → 캐시 hit, POST 0회.
 *   3. 만료 60s 전 → 갱신 (POST 1회).
 *   4. 동시 호출 5건 → single-flight (Promise dedupe), POST 1회.
 *
 * ## 설계
 *
 * - 캐시 위치 = **인스턴스 메모리 only** (§9 q2 [RESOLVED]).
 *   - 토글 인터페이스만 박아둠 (`KIS_TOKEN_STORE` 환경변수). 실 구현은 memory.
 *   - Vercel KV 도입은 배포 시점 별도 결정.
 *
 * - 키 = `${env}:${appKey}`. App Key 가 바뀌면 키도 달라져 자동 무효화.
 *   - 실전 / 모의 환경 분리 (KIS_ENV) 도 키에 포함 → cross-contamination 차단.
 *
 * - single-flight = `inflight: Map<key, Promise<string>>`.
 *   - 동시 도착한 요청은 동일 Promise 를 await.
 *   - 발급 완료 (성공·실패 무관) 시 inflight 에서 삭제.
 *
 * - **테스트 가능성**: 외부 의존 (HTTP fetcher) 을 옵션 주입. 기본값은 axios. 단위 테스트는 fake fetcher 주입.
 *
 * ## 환경변수
 *
 * - `KIS_APP_KEY` (필수)
 * - `KIS_APP_SECRET` (필수)
 * - `KIS_ENV` ("vts" | "prod") — 미설정 시 "vts"
 * - `KIS_TOKEN_STORE` ("memory" | "kv") — 토글 placeholder, 본 PR-A 는 "memory" 만 구현
 */

import { getKisClient, resolveKisEnv, type KisEnv } from "./client";
import { makeKisTokenError } from "./errors";
import type { KisTokenResponse } from "./types";

const GRACE_PERIOD_MS = 60_000; // 만료 60s 전부터 갱신.

type CacheEntry = {
  token: string;
  /** epoch ms — 이 시각 이전이면 cache hit. */
  expiresAt: number;
};

/** key = `${env}:${appKey}`. */
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string>>();

/**
 * HTTP fetcher 인터페이스 — 테스트 시 fake 주입 가능.
 *
 * 기본 구현은 axios + KIS `/oauth2/tokenP`.
 */
export type TokenFetcher = (params: {
  appKey: string;
  appSecret: string;
  env: KisEnv;
}) => Promise<KisTokenResponse>;

const defaultFetcher: TokenFetcher = async ({ appKey, appSecret, env }) => {
  const client = getKisClient();
  const response = await client.post<KisTokenResponse>("/oauth2/tokenP", {
    grant_type: "client_credentials",
    appkey: appKey,
    appsecret: appSecret,
  });
  void env; // base URL 이 env 를 흡수하므로 본 함수에선 사용 X. 테스트가 env 확인 시 사용.
  return response.data;
};

export type GetTokenOptions = {
  fetcher?: TokenFetcher;
  /** epoch ms — 테스트 가능성을 위해 시간 주입. 기본 `Date.now()`. */
  now?: () => number;
  /** 환경변수 override — 테스트 시 사용. */
  appKey?: string;
  appSecret?: string;
  env?: KisEnv;
};

/**
 * KIS access_token 을 반환한다. 캐시 hit 이면 즉시, 없으면 발급 후 캐시.
 *
 * 동시 호출은 single-flight 로 dedupe.
 */
export async function getAccessToken(options?: GetTokenOptions): Promise<string> {
  const appKey = options?.appKey ?? process.env.KIS_APP_KEY ?? "";
  const appSecret = options?.appSecret ?? process.env.KIS_APP_SECRET ?? "";
  const env = options?.env ?? resolveKisEnv();
  const now = options?.now ?? (() => Date.now());
  const fetcher = options?.fetcher ?? defaultFetcher;

  if (!appKey || !appSecret) {
    throw makeKisTokenError({
      errorCode: "missing_credentials",
      errorDescription:
        "KIS_APP_KEY 또는 KIS_APP_SECRET 환경변수가 설정되지 않았습니다.",
    });
  }

  const key = `${env}:${appKey}`;

  // 1. 캐시 hit?
  const cached = cache.get(key);
  if (cached && cached.expiresAt - GRACE_PERIOD_MS > now()) {
    return cached.token;
  }

  // 2. inflight?
  const pending = inflight.get(key);
  if (pending) {
    return pending;
  }

  // 3. 신규 발급.
  const promise = issueToken({ appKey, appSecret, env, fetcher, now })
    .then((entry) => {
      cache.set(key, entry);
      return entry.token;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

async function issueToken(params: {
  appKey: string;
  appSecret: string;
  env: KisEnv;
  fetcher: TokenFetcher;
  now: () => number;
}): Promise<CacheEntry> {
  const { appKey, appSecret, env, fetcher, now } = params;
  let response: KisTokenResponse;
  try {
    response = await fetcher({ appKey, appSecret, env });
  } catch (error) {
    throw makeKisTokenError({
      errorDescription:
        error instanceof Error
          ? error.message
          : "KIS 토큰 발급 중 네트워크 오류가 발생했어요.",
    });
  }

  if (response.error_code || !response.access_token) {
    throw makeKisTokenError({
      errorCode: response.error_code,
      errorDescription: response.error_description,
    });
  }

  // expires_in (초) 가 일반적. 없으면 KIS 정책 기본 24h 가정.
  const ttlSeconds = response.expires_in ?? 86_400;
  const expiresAt = now() + ttlSeconds * 1_000;
  return { token: response.access_token, expiresAt };
}

/**
 * 테스트 전용 — 캐시 + inflight 초기화.
 *
 * 본 PR-A 의 token.test.ts 가 4개 케이스 사이 격리에 사용.
 */
export function resetTokenCacheForTest(): void {
  cache.clear();
  inflight.clear();
}
