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

import { fetchIndexPrice } from "./index-price";
import { fetchOverseasIndex } from "./overseas-index";
import { getKisStore, type KisStore } from "./store";
import type { MarketIndexQuote } from "./types";

/** 국내 지수 store TTL — 30s 단일 진실 원천(§3.3 q4). */
const INDEX_STORE_TTL_SEC = 30;

/** 해외 지수 store TTL — 10분(일봉 갱신 주기, ticker 라우트 L1 정합). */
const OVERSEAS_STORE_TTL_SEC = 10 * 60;

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
    return fetchIndexPrice(code);
  }

  const key = indexStoreKey(code);
  const cached = await store.get<MarketIndexQuote>(key);
  if (cached) return cached;

  const quote = await fetchIndexPrice(code);
  await store.set(key, quote, INDEX_STORE_TTL_SEC);
  return quote;
}

/**
 * 해외 지수(SPX/COMP)를 L2 공유 store 경유로 조회. store hit(10분 윈도우) 시 KIS 실호출 0,
 * miss 시 `fetchOverseasIndex` 1회 후 store SET(10분 TTL).
 *
 * ticker·indices 두 라우트가 동시에 SPX/COMP를 요청하는 cold-start 시나리오에서
 * KIS 실호출 수를 줄여 EGW00201 drop 확률을 낮춘다.
 *
 * store 장애는 fail-soft → `fetchOverseasIndex` 직접 호출로 degrade.
 *
 * @param code 해외 지수 코드 ("SPX" / "COMP").
 * @param store 테스트용 store 주입(기본 `getKisStore()`).
 */
export async function fetchOverseasIndexShared(
  code: string,
  store: KisStore = getKisStore(),
): Promise<MarketIndexQuote> {
  if (!SHARED_OVERSEAS_CODES.has(code)) {
    return fetchOverseasIndex(code);
  }

  const key = indexStoreKey(code);
  const cached = await store.get<MarketIndexQuote>(key);
  if (cached) return cached;

  const quote = await fetchOverseasIndex(code);
  await store.set(key, quote, OVERSEAS_STORE_TTL_SEC);
  return quote;
}
