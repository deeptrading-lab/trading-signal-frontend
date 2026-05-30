/**
 * 국내 지수 공유 캐시(L2 store) 래퍼 — 크로스-라우트/크로스-인스턴스 dedup.
 *
 * PRD `kis-token-store` §3.3(부수 트랙) — 헤더 티커 라우트와 indices 라우트가 같은
 * 국내 코드(`0001` 코스피 / `1001` 코스닥)를 각자 호출하던 중복을, 공유 store(TTL 30s)로 묶는다.
 *
 * ## 설계
 *
 * - **범위 = 국내(`0001`/`1001`)만**(§3.3 q7 ① — 중복이 가장 잦은 코드). 그 외 코드는 store 미경유로
 *   `fetchIndexPrice` 직접 호출(해외/BTC 는 현행 라우트 인메모리 TTL 유지).
 * - **L1 라우트 인메모리 + L2 store 병행**(§3.3 q7 ②). 본 래퍼는 **L2 only** 담당 —
 *   라우트의 L1 캐시는 그대로 두고(승격·제거 0), L1 miss 시 라우트가 본 래퍼를 호출한다.
 * - **TTL = 30s 단일 진실 원천**(§3.3 q4 — `queryConfig.market.indices.staleTime`·ticker 국내분 정합).
 * - **락 없음, TTL 만**(§3.3 q6) — 지수는 중복돼도 데이터 동일이라 stampede 가 토큰만큼 치명적이지 않음.
 * - **fail-soft**: store 미설정/에러/타임아웃은 store 메서드가 흡수(null) → 라우트 인메모리 + KIS 직접
 *   호출로 graceful degrade. store 가 죽어도 지수 조회는 계속된다(§3.4).
 *
 * ## 키
 *
 * - `kis:index:{code}` (예 `kis:index:0001`). env 분리 불요(지수는 prod 전용 + appKey 무관 데이터).
 */

import { fetchIndexPrice } from "./index-price";
import { getKisStore, type KisStore } from "./store";
import type { MarketIndexQuote } from "./types";

/** 국내 지수 store TTL — 30s 단일 진실 원천(§3.3 q4). */
const INDEX_STORE_TTL_SEC = 30;

/** store 공유 캐시 대상 국내 코드(§3.3 q7 ①). 그 외는 store 미경유. */
const SHARED_INDEX_CODES = new Set(["0001", "1001"]);

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
