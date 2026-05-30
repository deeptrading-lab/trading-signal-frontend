/**
 * `/api/market/indices` BFF route.
 *
 * 브라우저 → 본 route handler → KIS REST 단방향 흐름. 직접 호출 금지 (AGENTS.md BFF 원칙).
 *
 * PRD `market-real-data` §3.3:
 *   - GET ?codes=0001,1001,2001 (또는 반복 ?codes=0001&codes=1001). 미입력 시 국내 3종 기본.
 *   - **이중 게이트 (§3.8)**: `isKisConfigured()` AND `resolveKisEnv()==="prod"` 통과 시에만
 *     KIS 실호출. 지수는 모의(vts) 미지원이라 prod 가 아니면 무조건 mock fallback.
 *   - **부분 성공 (§3.3 q4)**: `Promise.allSettled` 로 codes 병렬 호출 → 성공분만 반환.
 *     전부 실패 시에만 에러/mock 처리.
 *   - `X-Data-Source` (kis/mock/mock-timeout) + `X-KIS-Env` 헤더 (stock/price route 정합).
 *   - 5s 타임아웃 가드, 4xx 메시지 통과, 5xx/네트워크 한글 fallback, `Cache-Control: no-store`.
 *
 * PRD `market-indices-consolidation` §3.2 — 하드닝 (ticker 라우트 패턴 이식):
 *   - **2개씩 청크 + 청크 간 지연**으로 지수 호출(EGW00201 회피). 동시 난사 제거.
 *     청크 크기/지연은 ticker 라우트(`KIS_CHUNK_SIZE=2`/`120ms`)와 정합.
 *   - **L1 모듈 레벨 in-memory TTL 캐시**(`Map<code, {value, expiresAt}>`). 캐시 적중 code 는
 *     실호출 없이 즉시 반영, 미스 code 만 청크 대상. TTL 은 국내 지수 30s — ticker 라우트
 *     국내분(30s) + `queryConfig.market.indices.staleTime`(30s) 정합(단일 진실 원천).
 *   - 테스트 전용 캐시 리셋(`resetIndicesCacheForTest`) 노출 — ticker `resetTickerCacheForTest` 선례.
 *   - `X-Cache: hit/miss`(부분 적중 시 hit) 디버깅 헤더 — `X-Data-Source` 의미는 불변.
 *
 * PRD `kis-token-store` §3.3 — L2 공유 store(부수):
 *   - L1(라우트 인메모리) miss 시 `fetchIndexPriceShared` 경유 → 국내(0001/1001) 는 공유 store
 *     (TTL 30s)로 헤더 티커 라우트와 크로스-라우트/크로스-인스턴스 dedup. L1+L2 병행(라우트 캐시 유지).
 *     store 장애 시 fail-soft(인메모리 + KIS 직접 호출로 degrade).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  fetchIndexPriceShared,
  isKisConfigured,
  resolveKisEnv,
  type MarketIndexQuote,
} from "@/lib/api/kis";
import { isApiError } from "@/lib/api/errors";
import { getMockMarketIndices } from "@/lib/mock/market/indices";

/** 국내 지수 기본 3종 — KOSPI / KOSDAQ / KOSPI200. */
const DEFAULT_INDEX_CODES = ["0001", "1001", "2001"] as const;

const BFF_TIMEOUT_MS = 5_000;
const KIS_CHUNK_SIZE = 2; // EGW00201 회피 — 2개씩 청크 (ticker 라우트 정합).
const KIS_CHUNK_DELAY_MS = 120; // 청크 간 짧은 지연 (ticker 라우트 정합).

/** 국내 지수 서버 TTL 30s — queryConfig.market.indices.staleTime / ticker 국내분과 정합. */
const CACHE_TTL_MS = 30_000;

const FALLBACK_TIMEOUT_MESSAGE =
  "KIS 서버 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.";
const FALLBACK_SERVER_MESSAGE =
  "지수 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";

/** 모듈 레벨 in-memory TTL 캐시 — code 단위. 같은 인스턴스 warm 상태에서 KIS 실호출 보호. */
type CacheEntry = { value: MarketIndexQuote; expiresAt: number };
const indexCache = new Map<string, CacheEntry>();

export async function GET(request: NextRequest) {
  const codes = parseCodes(request.nextUrl.searchParams.getAll("codes"));

  // 이중 게이트 — 미설정 또는 prod 가 아니면 KIS 실호출을 시도하지 않고 mock.
  if (!isKisConfigured() || resolveKisEnv() !== "prod") {
    return jsonWithDataSource(getMockMarketIndices(codes), "mock", {
      "X-KIS-Env": resolveKisEnv(),
    });
  }

  try {
    const { quotes, cacheHit } = await withTimeout(
      fetchIndices(codes),
      BFF_TIMEOUT_MS,
    );
    // 전부 실패 → 비즈니스/네트워크 에러로 fallback 처리.
    if (quotes.length === 0) {
      return mapErrorToResponse(new Error("__ALL_FAILED__"), codes);
    }
    return jsonWithDataSource(quotes, "kis", {
      "X-KIS-Env": resolveKisEnv(),
      "X-Cache": cacheHit ? "hit" : "miss",
    });
  } catch (error) {
    return mapErrorToResponse(error, codes);
  }
}

/** codes 쿼리 파싱 — `0001,1001` 콤마 + 반복 파라미터 모두 허용. 빈값은 기본 3종. */
function parseCodes(raw: string[]): string[] {
  const flattened = raw
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  return flattened.length > 0 ? flattened : [...DEFAULT_INDEX_CODES];
}

/**
 * codes 를 2개씩 청크 + 청크 간 지연으로 호출(EGW00201 회피). 캐시 적중 code 는 실호출 없이
 * 즉시 반영, 미스 code 만 청크 대상. 부분 성공(성공분만 누적). 응답은 codes 순서를 보존한다.
 */
async function fetchIndices(
  codes: string[],
): Promise<{ quotes: MarketIndexQuote[]; cacheHit: boolean }> {
  const resolved = new Map<string, MarketIndexQuote>();
  let cacheHit = false;

  // 캐시 적중분 먼저 반영 + 미스 code 만 청크 호출 대상으로 수집.
  const misses: string[] = [];
  for (const code of codes) {
    const cached = readIndexCache(code);
    if (cached) {
      resolved.set(code, cached);
      cacheHit = true;
    } else {
      misses.push(code);
    }
  }

  // 2개씩 청크 + 청크 간 짧은 지연.
  for (let i = 0; i < misses.length; i += KIS_CHUNK_SIZE) {
    const chunk = misses.slice(i, i + KIS_CHUNK_SIZE);
    // L1(라우트 인메모리) miss → L2 공유 store 경유(국내 0001/1001 크로스-라우트 dedup, §3.3).
    const settled = await Promise.allSettled(
      chunk.map((code) => fetchIndexPriceShared(code)),
    );
    settled.forEach((r, idx) => {
      if (r.status === "fulfilled") {
        const code = chunk[idx];
        resolved.set(code, r.value);
        writeIndexCache(code, r.value);
      }
    });
    if (i + KIS_CHUNK_SIZE < misses.length) {
      await delay(KIS_CHUNK_DELAY_MS);
    }
  }

  // codes 순서를 보존해 성공분만 반환(부분 성공).
  const quotes = codes
    .map((code) => resolved.get(code))
    .filter((quote): quote is MarketIndexQuote => quote !== undefined);

  // 전부 실패 시 (실호출은 했지만 모두 reject) cacheHit 은 거짓.
  if (quotes.length === 0) cacheHit = false;

  return { quotes, cacheHit };
}

function readIndexCache(code: string): MarketIndexQuote | null {
  const entry = indexCache.get(code);
  if (entry && entry.expiresAt > Date.now()) return entry.value;
  return null;
}

function writeIndexCache(code: string, value: MarketIndexQuote): void {
  indexCache.set(code, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

function jsonWithDataSource(
  data: unknown,
  source: "mock" | "kis" | "mock-timeout",
  extraHeaders?: Record<string, string>,
): NextResponse {
  return NextResponse.json(data, {
    status: 200,
    headers: {
      "X-Data-Source": source,
      "Cache-Control": "no-store",
      ...(extraHeaders ?? {}),
    },
  });
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("__BFF_TIMEOUT__")), ms);
  });
  try {
    return (await Promise.race([promise, timeout])) as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapErrorToResponse(error: unknown, codes: string[]): NextResponse {
  // 타임아웃 → mock fallback (graceful degrade) + 한글 안내.
  if (error instanceof Error && error.message === "__BFF_TIMEOUT__") {
    return jsonWithDataSource(getMockMarketIndices(codes), "mock-timeout", {
      "X-Error": FALLBACK_TIMEOUT_MESSAGE,
      "X-KIS-Env": resolveKisEnv(),
    });
  }

  // 전부 실패 → 한글 fallback (mock 노출 대신 명시적 에러로 화면이 빈 상태 분기 가능).
  if (error instanceof Error && error.message === "__ALL_FAILED__") {
    return NextResponse.json(
      { error: FALLBACK_SERVER_MESSAGE },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (isApiError(error)) {
    return NextResponse.json(
      { error: error.message, detail: error.detail },
      {
        status: error.status && error.status >= 400 ? error.status : 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  return NextResponse.json(
    { error: FALLBACK_SERVER_MESSAGE },
    { status: 502, headers: { "Cache-Control": "no-store" } },
  );
}

/** 테스트 전용 — 모듈 레벨 캐시 초기화. */
export function resetIndicesCacheForTest(): void {
  indexCache.clear();
}
