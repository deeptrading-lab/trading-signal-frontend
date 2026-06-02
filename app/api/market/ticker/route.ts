/**
 * `/api/market/ticker` 합성 BFF route — 헤더 글로벌 마켓 티커 5종.
 *
 * 브라우저 → 본 route handler → KIS REST + CoinGecko 단방향. 직접 호출 금지(AGENTS.md BFF 원칙).
 *
 * PRD `header-market-ticker` §3.3:
 *   - GET → `MarketTicker[]` 5건. **순서 고정** [코스피, 코스닥, S&P 500, NASDAQ, BTC].
 *   - **이중 게이트(KIS 분)**: `isKisConfigured()` AND `resolveKisEnv()==="prod"` 통과 시에만
 *     KIS 4콜 시도. 미통과 시 국내·해외 지수는 mock.
 *   - **BTC 게이트(별도)**: KIS env 와 무관하게 시도(키 없이 호출). 실패 시 BTC 만 mock.
 *   - **동시성 제어(EGW00201 회피)**: KIS 4콜을 **2개씩 청크 + 청크 간 짧은 지연**. 동시 난사 금지.
 *   - **부분 성공**: `Promise.allSettled` 로 묶어 성공분만 반영. BTC 실패해도 지수 표시, 일부 지수
 *     실패해도 나머지. **5건 모두 실패 시에만 전체 mock degrade**(`X-Data-Source: mock`/`mock-timeout`).
 *   - **소스별 L1 in-memory TTL 캐싱**: 국내 30s / 해외 10분 / BTC 3분 (EGW00201·CoinGecko 한도 보호).
 *   - `X-Data-Source`(kis/mixed/mock/mock-timeout) + `X-KIS-Env` 헤더. 5s 타임아웃, `Cache-Control: no-store`.
 *
 * PRD `kis-token-store` §3.3 — L2 공유 store(부수): 국내(0001/1001)는 L1 miss 시 `fetchIndexPriceShared`
 *   경유 → 공유 store(TTL 30s)로 indices 라우트와 크로스-라우트/크로스-인스턴스 dedup. 해외는 현행 직접.
 *
 * `MarketTicker.value` 는 사전 포매팅된 표시 문자열(타입 정의) — BFF 가 `formatNumber` 로 천단위
 * 콤마 포함 문자열로 변환해 응답한다(지수 소수 2자리, BTC 정수).
 */

import {
  fetchIndexPriceShared,
  fetchOverseasIndexShared,
  isKisConfigured,
  resolveKisEnv,
  type MarketIndexQuote,
} from "@/lib/api/kis";
import { fetchBtcKrw } from "@/lib/api/coingecko/btc";
import type { BtcQuote } from "@/lib/api/coingecko/types";
import { HEADER_MARKET_TICKERS } from "@/lib/mock/layout/marketTickers";
import type { MarketTicker } from "@/lib/types/layout/marketTicker";
import { formatNumber } from "@/lib/utils/formatMoney";
import {
  withTimeout,
  delay,
  jsonWithDataSource,
  describeIndexError,
  BFF_TIMEOUT_SENTINEL,
} from "@/lib/server/bffUtils";

/** 합성 소스 정의 — 순서 고정 [코스피, 코스닥, S&P 500, NASDAQ, BTC]. */
const DOMESTIC_CODES = ["0001", "1001"] as const; // 코스피 / 코스닥.
const OVERSEAS_CODES = ["SPX", "COMP"] as const; // S&P 500 / NASDAQ 종합.

/** 표시 라벨 — mock 5건과 정합. 지수명은 어댑터 상수가 단일 진실. */
const TICKER_LABEL: Record<string, string> = {
  "0001": "KOSPI",
  "1001": "KOSDAQ",
  SPX: "S&P 500",
  COMP: "NASDAQ",
  BTC: "BTC",
};

const BFF_TIMEOUT_MS = 5_000;
const KIS_CHUNK_SIZE = 2; // EGW00201 회피 — 2개씩 청크.
const KIS_CHUNK_DELAY_MS = 120; // 청크 간 짧은 지연.

/** 소스별 in-memory TTL 캐싱(모듈 레벨). */
const CACHE_TTL_MS = {
  domestic: 30_000, // 국내 지수 30s.
  overseas: 10 * 60_000, // 해외 지수 10분(일봉, 거의 불변).
  btc: 3 * 60_000, // BTC 3분(CoinGecko 한도 보호).
} as const;

type CacheEntry<T> = { value: T; expiresAt: number };
const indexCache = new Map<string, CacheEntry<MarketIndexQuote>>();
let btcCache: CacheEntry<BtcQuote> | null = null;

// KIS 는 한국(서울) 서버다. 함수가 미 동부(iad1)에서 실행되면 해외 지수 엔드포인트가 HTTP 500 을
// 반환해 SPX/COMP 가 드롭되는 현상(2026-06-03 진단)을 회피하기 위해 실행 리전을 서울(icn1)로 고정한다.
export const preferredRegion = "icn1";

export async function GET() {
  const kisLive = isKisConfigured() && resolveKisEnv() === "prod";

  try {
    const { quotes, btc, kisFulfilled, btcFulfilled } = await withTimeout(
      collect(kisLive),
      BFF_TIMEOUT_MS,
    );

    // 전체 실패 — 지수·BTC 모두 0건 → mock degrade.
    if (quotes.size === 0 && !btc) {
      return jsonWithDataSource(getMockTickers(), "mock", {
        "X-KIS-Env": resolveKisEnv(),
      });
    }

    const tickers = assembleTickers(quotes, btc);
    const source = resolveSource(kisLive, kisFulfilled, btcFulfilled);
    return jsonWithDataSource(tickers, source, {
      "X-KIS-Env": resolveKisEnv(),
    });
  } catch (error) {
    // 타임아웃·예기치 못한 오류 → mock degrade(헤더 끊김 0).
    const source =
      error instanceof Error && error.message === BFF_TIMEOUT_SENTINEL
        ? "mock-timeout"
        : "mock";
    return jsonWithDataSource(getMockTickers(), source, {
      "X-KIS-Env": resolveKisEnv(),
    });
  }
}

/**
 * 5소스 수집 — KIS 4콜(2개씩 청크 + 지연) + BTC(독립 병렬). 부분 성공.
 *
 * @param kisLive 이중 게이트 통과 여부. false 면 KIS 콜을 시도하지 않는다(실호출 0).
 */
async function collect(kisLive: boolean): Promise<{
  quotes: Map<string, MarketIndexQuote>;
  btc: BtcQuote | null;
  kisFulfilled: number;
  btcFulfilled: boolean;
}> {
  // BTC 는 KIS 와 독립 병렬 — 게이트 무관(키 없이 호출).
  const btcPromise = loadBtc();
  // KIS 4콜은 청크 단위로 순차(게이트 미통과 시 빈 결과).
  const kisPromise = kisLive
    ? loadKisIndices()
    : Promise.resolve(new Map<string, MarketIndexQuote>());

  const [quotes, btc] = await Promise.all([kisPromise, btcPromise]);
  return {
    quotes,
    btc,
    kisFulfilled: quotes.size,
    btcFulfilled: btc !== null,
  };
}

/**
 * KIS 국내·해외 지수 4콜을 2개씩 청크 + 청크 간 지연으로 호출(EGW00201 회피).
 * 캐시 적중 코드는 실호출 없이 즉시 반영. 부분 성공(성공분만 Map 에 누적).
 */
async function loadKisIndices(): Promise<Map<string, MarketIndexQuote>> {
  const result = new Map<string, MarketIndexQuote>();

  // 캐시 적중분 먼저 반영 + 미스 코드만 청크 호출 대상으로 수집.
  const misses: Array<{ code: string; kind: "domestic" | "overseas" }> = [];
  for (const code of DOMESTIC_CODES) {
    const cached = readIndexCache(code, CACHE_TTL_MS.domestic);
    if (cached) result.set(code, cached);
    else misses.push({ code, kind: "domestic" });
  }
  for (const code of OVERSEAS_CODES) {
    const cached = readIndexCache(code, CACHE_TTL_MS.overseas);
    if (cached) result.set(code, cached);
    else misses.push({ code, kind: "overseas" });
  }

  // 2개씩 청크 + 청크 간 짧은 지연.
  for (let i = 0; i < misses.length; i += KIS_CHUNK_SIZE) {
    const chunk = misses.slice(i, i + KIS_CHUNK_SIZE);
    const settled = await Promise.allSettled(
      chunk.map(({ code, kind }) => {
        // 국내(0001/1001)는 L2 공유 store 경유로 indices 라우트와 dedup(§3.3). 해외는 현행 직접.
        const startedAt = Date.now();
        const call =
          kind === "domestic"
            ? fetchIndexPriceShared(code)
            : fetchOverseasIndexShared(code);
        // 진단(2026-06-03): allSettled 가 reject 를 조용히 드롭해 X-Data-Source=mixed 원인(특히
        // 해외 SPX/COMP 누락)이 prod 로그에 안 남았음. 드롭 사유·소요시간을 노출한다.
        return call.catch((error: unknown) => {
          console.warn(
            `[market/ticker] 지수 드롭 code=${code} kind=${kind} dur=${Date.now() - startedAt}ms ${describeIndexError(error)}`,
          );
          throw error;
        });
      }),
    );
    settled.forEach((r, idx) => {
      if (r.status === "fulfilled") {
        const { code } = chunk[idx];
        result.set(code, r.value);
        writeIndexCache(code, r.value);
      }
    });
    if (i + KIS_CHUNK_SIZE < misses.length) {
      await delay(KIS_CHUNK_DELAY_MS);
    }
  }

  return result;
}

/** BTC — 캐시 적중 시 즉시, 미스 시 실호출(실패는 null 로 부분 성공). */
async function loadBtc(): Promise<BtcQuote | null> {
  if (btcCache && btcCache.expiresAt > Date.now()) {
    return btcCache.value;
  }
  try {
    const quote = await fetchBtcKrw();
    btcCache = { value: quote, expiresAt: Date.now() + CACHE_TTL_MS.btc };
    return quote;
  } catch {
    return null;
  }
}

function readIndexCache(code: string, ttl: number): MarketIndexQuote | null {
  const entry = indexCache.get(code);
  if (entry && entry.expiresAt > Date.now()) return entry.value;
  void ttl; // ttl 은 write 시점에 반영되므로 read 는 만료만 확인.
  return null;
}

function writeIndexCache(code: string, value: MarketIndexQuote): void {
  const ttl = OVERSEAS_CODES.includes(code as (typeof OVERSEAS_CODES)[number])
    ? CACHE_TTL_MS.overseas
    : CACHE_TTL_MS.domestic;
  indexCache.set(code, { value, expiresAt: Date.now() + ttl });
}

/**
 * 성공분(quotes + btc)을 고정 순서 [코스피, 코스닥, S&P 500, NASDAQ, BTC] 로 정렬해
 * `MarketTicker[]` 합성. 누락분은 빠지되 상대 순서 유지(부분 성공).
 */
function assembleTickers(
  quotes: Map<string, MarketIndexQuote>,
  btc: BtcQuote | null,
): MarketTicker[] {
  const tickers: MarketTicker[] = [];

  for (const code of [...DOMESTIC_CODES, ...OVERSEAS_CODES]) {
    const quote = quotes.get(code);
    if (!quote) continue;
    tickers.push({
      code: TICKER_LABEL[code] ?? quote.name,
      value: formatNumber(quote.value, { digits: 2 }),
      changePct: round2(quote.changePercent),
      // 지수는 한국식 등락(flat 은 하락 톤 흡수, 기존 2색 유지).
      isUp: quote.direction === "up",
    });
  }

  if (btc) {
    tickers.push({
      code: TICKER_LABEL.BTC,
      value: formatNumber(btc.value, { digits: 0 }),
      // BTC 24h 등락은 raw float → 페이로드 정합 위해 소수 2자리로 정규화.
      changePct: round2(btc.changePct),
      isUp: btc.isUp,
    });
  }

  return tickers;
}

/** 등락률 소수 2자리 정규화 — 페이로드 일관성(지수·BTC 동일 자릿수). */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** mock 5건 — fixture 그대로(이미 표시 문자열 + 한국식 isUp). */
function getMockTickers(): MarketTicker[] {
  return HEADER_MARKET_TICKERS;
}

/**
 * `X-Data-Source` 결정:
 *   - 게이트 미통과(국내·해외 mock) + BTC 실패 → mock
 *   - KIS 4건 + BTC 모두 성공 → kis
 *   - 일부만 성공 → mixed (부분 라이브)
 */
function resolveSource(
  kisLive: boolean,
  kisFulfilled: number,
  btcFulfilled: boolean,
): "kis" | "mixed" | "mock" {
  const allKis = kisLive && kisFulfilled === DOMESTIC_CODES.length + OVERSEAS_CODES.length;
  if (allKis && btcFulfilled) return "kis";
  const anyLive = (kisLive && kisFulfilled > 0) || btcFulfilled;
  return anyLive ? "mixed" : "mock";
}

/** 테스트 전용 — 모듈 레벨 캐시 초기화. */
export function resetTickerCacheForTest(): void {
  indexCache.clear();
  btcCache = null;
}
