/**
 * 지수 공유 캐시(L2 store) 래퍼 — 국내·해외 크로스-라우트/크로스-인스턴스 dedup.
 *
 * PRD `kis-token-store` §3.3(부수 트랙) — 헤더 티커 라우트와 indices 라우트가 같은
 * 국내 코드(`0001` 코스피 / `1001` 코스닥)를 각자 호출하던 중복을, 공유 store(TTL 30s)로 묶는다.
 *
 * ## 설계
 *
 * - **국내(`0001`/`1001`) + 해외(`SPX`/`COMP`)** 모두 store 경유. TTL만 다름(국내 30s / 해외 10분).
 * - **L1 라우트 인메모리 + L2 store 병행**. 본 래퍼는 **L2 only** 담당 —
 *   라우트의 L1 캐시는 그대로 두고(승격·제거 0), L1 miss 시 라우트가 본 래퍼를 호출한다.
 * - **fail-soft**: store 미설정/에러/타임아웃은 store 메서드가 흡수(null) → 라우트 인메모리 + KIS 직접
 *   호출로 graceful degrade. store 가 죽어도 지수 조회는 계속된다.
 * - **navbar 코스닥 cold-start drop 방어**: 해외도 L2에 캐싱되면 ticker/indices 라우트 동시 발화 시
 *   KIS 실호출 수가 줄어 EGW00201 drop 확률 감소.
 *
 * ## 키
 *
 * - `kis:index:{code}` (예 `kis:index:0001`, `kis:index:SPX`).
 */

import { isApiError } from "@/lib/api/errors";
import { fetchOverseasIndexFallback } from "@/lib/api/market/overseasIndexFallback";
import { fetchIndexPrice } from "./index-price";
import { fetchOverseasIndex } from "./overseas-index";
import { getKisStore, type KisStore } from "./store";
import type { MarketIndexQuote } from "./types";

/** 국내 지수 store TTL — 30s 단일 진실 원천(§3.3 q4). */
const INDEX_STORE_TTL_SEC = 30;

/** 해외 지수 store TTL — 10분(일봉 갱신 주기, ticker 라우트 L1 정합). */
const OVERSEAS_STORE_TTL_SEC = 10 * 60;

/**
 * 직전 성공값(last-known-good) 보관 TTL — 24h.
 *
 * KIS 해외 지수 엔드포인트가 (미 동부 egress 등에서) 간헐적 HTTP 500 을 반환해 SPX/COMP 가
 * 드롭되던 현상(2026-06-03 진단) 방어선: 한 번이라도 성공하면 그 종가를 별도 키에 24h 보관하고,
 * 이후 전송성 실패(5xx/네트워크) 시 직전 종가로 폴백해 화면이 비지 않게 한다(지수는 일봉이라 무방).
 * prod 는 Upstash(L2) 공유라 인스턴스 간·콜드스타트까지 폴백값이 살아남는다.
 */
const LAST_GOOD_TTL_SEC = 24 * 60 * 60;

/** 전송성 실패 재시도 — 간헐적 5xx/네트워크면 짧은 backoff 후 재시도로 200 을 잡는다. */
const RETRY_BACKOFF_MS = 250;
const MAX_RETRIES = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 재시도/폴백 대상인 전송성 실패(5xx server / 네트워크·타임아웃)인지. 비즈니스 에러는 제외. */
function isTransientError(error: unknown): boolean {
  return isApiError(error) && (error.kind === "server" || error.kind === "network");
}

/** transient 실패면 짧은 backoff 로 최대 MAX_RETRIES 회 재시도. 비즈니스 에러는 즉시 전파. */
async function fetchWithRetry(
  fetcher: () => Promise<MarketIndexQuote>,
): Promise<MarketIndexQuote> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await fetcher();
    } catch (error) {
      lastError = error;
      if (!isTransientError(error) || attempt === MAX_RETRIES) throw error;
      await sleep(RETRY_BACKOFF_MS * (attempt + 1));
    }
  }
  throw lastError;
}

/**
 * 공유 store 경유 + 재시도 + 직전 성공값 폴백.
 *   1) L2 fresh hit → 즉시 반환(KIS 실호출 0).
 *   2) miss → 재시도 포함 fetch. 성공 시 fresh(짧은 TTL) + last-good(24h) 둘 다 SET.
 *   3) 전송성 실패(5xx/네트워크) → last-good 폴백(있으면). 없으면 원에러 전파(부분성공 드롭).
 */
async function fetchSharedResilient(
  code: string,
  store: KisStore,
  fetcher: () => Promise<MarketIndexQuote>,
  freshTtlSec: number,
): Promise<MarketIndexQuote> {
  const key = indexStoreKey(code);
  const lastGoodKey = `${key}:last`;

  const cached = await store.get<MarketIndexQuote>(key);
  if (cached) return cached;

  try {
    const quote = await fetchWithRetry(fetcher);
    await store.set(key, quote, freshTtlSec);
    await store.set(lastGoodKey, quote, LAST_GOOD_TTL_SEC);
    return quote;
  } catch (error) {
    if (isTransientError(error)) {
      const stale = await store.get<MarketIndexQuote>(lastGoodKey);
      if (stale) return stale; // 직전 종가로 폴백 — 화면 비움 방지.
    }
    throw error;
  }
}

/** store 공유 캐시 대상 국내 코드. */
const SHARED_INDEX_CODES = new Set(["0001", "1001"]);

/**
 * store 공유 캐시 대상 해외 코드.
 * 의도적 중복: route.ts의 `OVERSEAS_CODES_SET`(라우트 분기용)과 내용은 같지만 역할이 달라 별도 유지.
 * 해외 지수 코드 추가 시 두 곳 모두 갱신 필요.
 */
const SHARED_OVERSEAS_CODES = new Set(["SPX", "COMP"]);

function indexStoreKey(code: string): string {
  return `kis:index:${code}`;
}

/** 본 래퍼가 store 공유 캐시를 적용하는 코드인지(국내 0001/1001). */
export function isSharedIndexCode(code: string): boolean {
  return SHARED_INDEX_CODES.has(code);
}

/**
 * 국내 지수 현재값을 L2 공유 store 경유로 조회. store hit(30s 윈도우) 시 KIS 실호출 0,
 * miss 시 `fetchIndexPrice` 1회 후 store SET. 국내 코드가 아니면 store 미경유 직접 호출.
 *
 * store 장애는 store 메서드가 흡수(fail-soft) → KIS 직접 호출로 degrade.
 *
 * @param code 지수 코드. 국내(`0001`/`1001`)만 store 공유, 그 외는 직접.
 * @param store 테스트용 store 주입(기본 `getKisStore()`).
 */
export async function fetchIndexPriceShared(
  code: string,
  store: KisStore = getKisStore(),
): Promise<MarketIndexQuote> {
  if (!isSharedIndexCode(code)) {
    return fetchWithRetry(() => fetchIndexPrice(code));
  }
  return fetchSharedResilient(
    code,
    store,
    () => fetchIndexPrice(code),
    INDEX_STORE_TTL_SEC,
  );
}

/**
 * KIS 해외 지수 1차 + 실패 시 Yahoo 폴백.
 *
 * KIS 가 비-한국 IP(Vercel 미국)에서 HTTP 500 을 주는 제약(2026-06-03 진단)을 우회 —
 * KIS 가 성공하면(한국 실행 등) 그 값을, 실패하면 US-friendly Yahoo 소스로 SPX/COMP 를 채운다.
 * 둘 다 실패하면 원 KIS 에러를 전파(상위에서 스테일 폴백/드롭 처리).
 */
async function fetchOverseasWithFallback(
  code: string,
): Promise<MarketIndexQuote> {
  try {
    return await fetchOverseasIndex(code);
  } catch (kisError) {
    try {
      return await fetchOverseasIndexFallback(code);
    } catch {
      throw kisError; // 폴백도 실패 → 원 KIS 에러(transient면 상위가 스테일로 메움).
    }
  }
}

/**
 * 해외 지수(SPX/COMP)를 L2 공유 store 경유로 조회. store hit(10분 윈도우) 시 실호출 0,
 * miss 시 KIS→Yahoo 폴백 체인 + 직전 성공값(24h) 폴백(`fetchSharedResilient`).
 *
 * store 장애는 fail-soft → 직접 호출로 degrade.
 *
 * @param code 해외 지수 코드 ("SPX" / "COMP").
 * @param store 테스트용 store 주입(기본 `getKisStore()`).
 */
export async function fetchOverseasIndexShared(
  code: string,
  store: KisStore = getKisStore(),
): Promise<MarketIndexQuote> {
  if (!SHARED_OVERSEAS_CODES.has(code)) {
    return fetchOverseasWithFallback(code);
  }
  return fetchSharedResilient(
    code,
    store,
    () => fetchOverseasWithFallback(code),
    OVERSEAS_STORE_TTL_SEC,
  );
}
