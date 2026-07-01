import type { MarketIndexQuote } from "@/lib/api/kis";
import type { BtcQuote } from "@/lib/api/coingecko/types";

/**
 * `app/api/market/ticker` 라우트의 모듈 레벨 in-memory TTL 캐시 — 지수(code 단위) + BTC.
 * 같은 인스턴스 warm 상태에서 KIS·CoinGecko 실호출을 보호한다.
 *
 * 캐시 상태·리셋을 route.ts 밖으로 분리한 이유: Next.js 라우트 파일은 HTTP 핸들러·허용된
 * config 외 임의 함수 export 가 금지된다(`next build`/`build:analyze` 타입체크 위반). 테스트가
 * 캐시 격리에 쓰는 `resetTickerCacheForTest` 를 라우트에서 export 하면 빌드가 실패하므로,
 * 캐시와 리셋을 라우트가 아닌 본 모듈에 둔다(co-located, 라우트 아님). `btcCache` 는 `let`
 * 재할당이 모듈 경계 밖에서 불가하므로 getter/setter 로 노출.
 */
export type CacheEntry<T> = { value: T; expiresAt: number };

export const indexCache = new Map<string, CacheEntry<MarketIndexQuote>>();

let btcCache: CacheEntry<BtcQuote> | null = null;
export function getBtcCache(): CacheEntry<BtcQuote> | null {
  return btcCache;
}
export function setBtcCache(entry: CacheEntry<BtcQuote> | null): void {
  btcCache = entry;
}

/** 테스트 전용 — 모듈 레벨 캐시 초기화. */
export function resetTickerCacheForTest(): void {
  indexCache.clear();
  btcCache = null;
}
