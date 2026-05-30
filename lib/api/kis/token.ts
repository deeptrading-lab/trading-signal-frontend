/**
 * KIS access_token 발급 + 2단 캐시(L1 인스턴스 메모리 + L2 공유 store) + 분산 single-flight.
 *
 * PRD `stock-api-integration` §6.2 AC-6(현행 4동작) + `kis-token-store` §3.2(2단 캐시·분산 락):
 *   1. 첫 호출 → POST /oauth2/tokenP 1회.
 *   2. 두 번째 호출 → L1 캐시 hit, POST 0회.
 *   3. 만료 60s 전 → 갱신 (POST 1회).
 *   4. 동시 호출 5건 → 인스턴스 내 single-flight (Promise dedupe), POST 1회.
 *   5. (kv) 여러 인스턴스 동시 miss → 분산 락(SET NX PX) 1인스턴스만 발급, 나머지 폴링으로 수렴.
 *
 * ## 설계 — 2단 수렴
 *
 * - **L1 = 인스턴스 메모리**(`cache` Map) + `inflight`(Promise dedupe). 현행 유지 → memory 모드 무회귀.
 *   - 같은 인스턴스의 동시 요청은 store/락 왕복도 1번으로 묶인다(인스턴스 "내" single-flight).
 * - **L2 = 공유 store**(`getKisStore()`). 키 = `kis:token:{env}:{appkeyhash}`(SHA-256 앞 16자, 평문 금지).
 *   - 조회 흐름: L1 fresh → 반환 / L1 miss → L2 GET fresh → L1 채우고 반환 / L2 miss → 분산 락.
 *   - 분산 락: `SET NX PX 10s`(키 `kis:lock:token:{env}:{hash}`). 잡은 1인스턴스만 발급 후 store SET + L1.
 *     못 잡으면 50ms 간격 × 최대 ~2s 폴링으로 store 재조회 → 받으면 반환.
 *   - **fallback(§3.2 q3)**: 락 미획득 + 폴링 만료해도 store 비면 → **직접 발급**(가용성 우선).
 * - **fail-soft(§3.4)**: store 미설정/타임아웃/에러는 store 메서드가 null/false 로 흡수(throw 0).
 *   memory 모드(기본)에선 store 가 인스턴스 내 Map 이라 L2 가 사실상 no-op → 현행 L1 경로와 동일.
 *
 * - 키(L1) = `${env}:${appKey}`(인스턴스 메모리 — 평문 OK, 프로세스 밖 미노출). store 키만 해시.
 *   - 실전 / 모의 환경 분리 (KIS_ENV) 도 키에 포함 → cross-contamination 차단.
 *
 * - **테스트 가능성**: HTTP fetcher·now 옵션 주입(기본 axios/Date.now). store 는 `setKisStoreForTest` 주입.
 *
 * ## 환경변수
 *
 * - `KIS_APP_KEY` / `KIS_APP_SECRET` (필수), `KIS_ENV` ("vts"|"prod", 기본 vts).
 * - `KIS_TOKEN_STORE` ("memory"|"kv") — store.ts 가 해석(미설정/store 에러 시 memory 폴백).
 */

import { getKisClient, resolveKisEnv, type KisEnv } from "./client";
import { makeKisTokenError } from "./errors";
import {
  getKisStore,
  hashAppKey,
  STORE_POLL_TIMEOUT_MS,
  type KisStore,
} from "./store";
import type { KisTokenResponse } from "./types";

const GRACE_PERIOD_MS = 60_000; // 만료 60s 전부터 갱신.

/** 분산 락 TTL(PX) — 데드락 방지. PRD §3.2 q5. */
const LOCK_TTL_MS = 10_000;
/**
 * 락 미획득 시 store 재조회 폴링 — 50ms 간격.
 *
 * ⚠️ 폴링은 **store 가 정상인데 다른 인스턴스가 락을 잡은 경우에만** 진입한다(store 장애 신호 시
 * 폴링을 건너뛰고 즉시 직접발급). 그래도 폴링 누적이 라우트 타임아웃(5s)을 위협하지 않도록:
 *   - 각 폴링 get 타임아웃을 짧게(`STORE_POLL_TIMEOUT_MS`=150ms),
 *   - 총 폴링 시간 상한(`POLL_MAX_TOTAL_MS`=1500ms)을 두어 그 안에 못 받으면 직접발급,
 *   - 폴링 중 store 가 degrade(타임아웃·에러)하면 즉시 폴링 중단 → 직접발급(fail-soft).
 */
const POLL_INTERVAL_MS = 50;
/** 총 폴링 시간 상한 — 라우트 타임아웃(5s) 한참 아래. 초과 시 직접발급 fallback. */
const POLL_MAX_TOTAL_MS = 1_500;
const POLL_MAX_ATTEMPTS = Math.ceil(
  POLL_MAX_TOTAL_MS / (POLL_INTERVAL_MS + STORE_POLL_TIMEOUT_MS),
);

type CacheEntry = {
  token: string;
  /** epoch ms — 이 시각 이전이면 fresh. */
  expiresAt: number;
};

/** L1 key = `${env}:${appKey}`. */
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
  /** 공유 store override — 테스트 시 fake 주입. 기본 `getKisStore()`. */
  store?: KisStore;
};

/**
 * KIS access_token 을 반환한다. L1 hit → 즉시 / L1 miss → L2 store/분산 락 경유.
 *
 * 인스턴스 내 동시 호출은 single-flight(inflight Promise)로 dedupe → store/락 왕복도 1회.
 */
export async function getAccessToken(options?: GetTokenOptions): Promise<string> {
  const appKey = options?.appKey ?? process.env.KIS_APP_KEY ?? "";
  const appSecret = options?.appSecret ?? process.env.KIS_APP_SECRET ?? "";
  const env = options?.env ?? resolveKisEnv();
  const now = options?.now ?? (() => Date.now());
  const fetcher = options?.fetcher ?? defaultFetcher;
  const store = options?.store ?? getKisStore();

  if (!appKey || !appSecret) {
    throw makeKisTokenError({
      errorCode: "missing_credentials",
      errorDescription:
        "KIS_APP_KEY 또는 KIS_APP_SECRET 환경변수가 설정되지 않았습니다.",
    });
  }

  const l1Key = `${env}:${appKey}`;

  // 1. L1 인스턴스 메모리 hit?
  const cached = cache.get(l1Key);
  if (cached && isFresh(cached, now)) {
    return cached.token;
  }

  // 2. 인스턴스 내 inflight? (single-flight — store/락 왕복도 1번으로 묶음)
  const pending = inflight.get(l1Key);
  if (pending) {
    return pending;
  }

  // 3. L2 store + 분산 single-flight.
  const promise = resolveTokenViaStore({
    l1Key,
    appKey,
    appSecret,
    env,
    fetcher,
    now,
    store,
  })
    .then((entry) => {
      cache.set(l1Key, entry);
      return entry.token;
    })
    .finally(() => {
      inflight.delete(l1Key);
    });

  inflight.set(l1Key, promise);
  return promise;
}

function isFresh(entry: CacheEntry, now: () => number): boolean {
  return entry.expiresAt - GRACE_PERIOD_MS > now();
}

/**
 * L2 store 조회 → miss 시 분산 락으로 1인스턴스만 발급, 나머지는 폴링 수렴. 끝까지 못 받으면 직접 발급.
 *
 * fail-soft: store 메서드는 throw 하지 않고 null/false 로 degrade → memory 모드는 사실상 직발급 경로.
 */
async function resolveTokenViaStore(params: {
  l1Key: string;
  appKey: string;
  appSecret: string;
  env: KisEnv;
  fetcher: TokenFetcher;
  now: () => number;
  store: KisStore;
}): Promise<CacheEntry> {
  const { appKey, appSecret, env, fetcher, now, store } = params;
  const storeKey = `kis:token:${env}:${hashAppKey(appKey)}`;
  const lockKey = `kis:lock:token:${env}:${hashAppKey(appKey)}`;
  const issue = () => issueToken({ appKey, appSecret, env, fetcher, now });

  // 2-1. L2 store hit?
  const stored = await store.get<CacheEntry>(storeKey);
  if (stored && isFresh(stored, now)) {
    return stored;
  }
  // store 도달 불가(타임아웃·에러)면 락/폴링이 무의미 → 즉시 직접발급 fail-soft(§3.4).
  if (storeDegraded(store)) {
    return issue();
  }

  // 2-2. 분산 락 시도.
  const lockToken = await store.acquireLock(lockKey, LOCK_TTL_MS);
  if (lockToken) {
    try {
      const entry = await issue();
      // store TTL = (만료 - grace) 초. 음수 방지로 최소 1s.
      const ttlSec = Math.max(
        1,
        Math.floor((entry.expiresAt - GRACE_PERIOD_MS - now()) / 1_000),
      );
      await store.set(storeKey, entry, ttlSec);
      return entry;
    } finally {
      await store.releaseLock(lockKey, lockToken);
    }
  }

  // 락 미획득(null)에는 두 의미가 섞인다:
  //   ① store 정상 + 다른 인스턴스가 락 보유(→ 폴링으로 수렴해야 함)
  //   ② store 도달 불가로 폴백(→ 폴링 무의미, 즉시 직접발급)
  // ②면 폴링 starvation(누적 지연)을 피하기 위해 곧장 직접발급한다(QA AC-6 blocking 수정).
  if (storeDegraded(store)) {
    return issue();
  }

  // 2-3. (store 정상 + 락 미획득) → 다른 인스턴스가 발급 중 → 짧게 폴링하며 store 재조회.
  //       각 get 은 짧은 타임아웃, 총 폴링 시간은 상한(POLL_MAX_TOTAL_MS) 내. 폴링 중 store 가
  //       degrade 하면 즉시 중단 → 직접발급(누적 지연이 라우트 타임아웃을 넘지 않게).
  for (let i = 0; i < POLL_MAX_ATTEMPTS; i += 1) {
    await delay(POLL_INTERVAL_MS);
    const polled = await store.get<CacheEntry>(storeKey, STORE_POLL_TIMEOUT_MS);
    if (polled && isFresh(polled, now)) {
      return polled;
    }
    if (storeDegraded(store)) {
      break; // 폴링 도중 store 장애 → 직접발급으로 fail-soft.
    }
  }

  // 2-4. 폴링 만료/중단 → 직접 발급 fallback(가용성 우선, §3.2 q3).
  return issue();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 직전 store 호출이 장애(타임아웃·에러)로 폴백했는지. store 가 신호를 노출하지 않으면(선택 메서드
 * 미구현 — memory·단순 fake) 장애 없음(false)으로 간주. "정당한 miss/락-미획득" 과 "store 도달
 * 불가" 를 구분해 후자일 때 폴링을 건너뛰고 즉시 직접발급하기 위한 fail-soft 판정.
 */
function storeDegraded(store: KisStore): boolean {
  return store.wasLastCallDegraded?.() ?? false;
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
 * 테스트 전용 — L1 캐시 + inflight 초기화.
 *
 * L2 store 는 별도(`setKisStoreForTest`)로 격리.
 */
export function resetTokenCacheForTest(): void {
  cache.clear();
  inflight.clear();
}
