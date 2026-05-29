/**
 * `/api/watchlist` BFF route — 관심종목 시세+메타 합성.
 *
 * 브라우저 → 본 route handler → KIS REST 단방향. 직접 호출 금지 (AGENTS.md BFF 원칙).
 *
 * PRD `watchlist-real-data` §3.3:
 *   - GET ?tickers=005930,000660 (또는 반복 ?tickers=005930&tickers=000660). 빈값 → 빈 배열(200).
 *   - **soft cap 30** — 초과분 truncate + `X-Watchlist-Truncated` 헤더 경고.
 *   - 종목당 **시세(fetchStockPrice) + 메타(fetchStockInfo)** 합성:
 *     · 시세 게이트(단일) — `inquire-price` 는 모의 지원 → `isKisConfigured()` 만 통과하면 KIS, 아니면 mock.
 *     · 메타 게이트(이중) — `search-stock-info` 는 실전 전용 → `isKisConfigured()` AND
 *       `resolveKisEnv()==="prod"` 통과 시에만 호출. 그 외엔 종목명 fallback
 *       (symbols.json 시드 name → ticker), 시세 `extractStockName` 의존 금지.
 *   - **부분 성공** — `Promise.allSettled` 로 종목별·API별. 시세 성공 + 메타 실패면 fallback name 으로 디그레이드.
 *   - 5s 타임아웃 가드, 4xx 메시지 통과, 5xx/전체실패 한글 fallback, `Cache-Control: no-store`.
 *   - `X-Data-Source` (kis/mock/mock-timeout) + `X-KIS-Env` 헤더.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  fetchStockPrice,
  fetchStockInfo,
  isKisConfigured,
  resolveKisEnv,
  searchSymbols,
  type StockInfo,
  type StockPrice,
} from "@/lib/api/kis";
import { isApiError } from "@/lib/api/errors";
import { getMockWatchlist } from "@/lib/mock/watchlist/quotes";
import type { WatchlistQuote } from "@/lib/api/watchlist/list";

/** 관심종목 soft cap — 초과분 truncate (§3.3). */
const SOFT_CAP = 30;

const FALLBACK_TIMEOUT_MESSAGE =
  "KIS 서버 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.";
const FALLBACK_SERVER_MESSAGE =
  "관심종목 시세를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";

export async function GET(request: NextRequest) {
  const { tickers, truncated } = parseTickers(
    request.nextUrl.searchParams.getAll("tickers"),
  );

  // 빈 입력 → 호출 없이 빈 배열 (200).
  if (tickers.length === 0) {
    return jsonWithDataSource([], "mock", { "X-KIS-Env": resolveKisEnv() });
  }

  const extraHeaders: Record<string, string> = {
    "X-KIS-Env": resolveKisEnv(),
  };
  if (truncated) {
    extraHeaders["X-Watchlist-Truncated"] = `soft-cap-${SOFT_CAP}`;
  }

  // 시세 게이트(단일) 미통과 → 전체 mock.
  if (!isKisConfigured()) {
    return jsonWithDataSource(getMockWatchlist(tickers), "mock", extraHeaders);
  }

  const metaEnabled = resolveKisEnv() === "prod"; // 메타 게이트(이중).

  try {
    const data = await withTimeout(
      fetchWatchlistSettled(tickers, metaEnabled),
      5_000,
    );
    // 전부 실패 → 비즈니스/네트워크 에러 fallback.
    if (data.length === 0) {
      return mapErrorToResponse(new Error("__ALL_FAILED__"), tickers, truncated);
    }
    return jsonWithDataSource(data, "kis", extraHeaders);
  } catch (error) {
    return mapErrorToResponse(error, tickers, truncated);
  }
}

/** tickers 쿼리 파싱 — 콤마 + 반복 파라미터 허용. 중복 제거 + soft cap. */
function parseTickers(raw: string[]): { tickers: string[]; truncated: boolean } {
  const flattened = raw
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  const unique = Array.from(new Set(flattened));
  const truncated = unique.length > SOFT_CAP;
  return { tickers: unique.slice(0, SOFT_CAP), truncated };
}

/**
 * 종목 병렬 합성 — 종목별 `Promise.allSettled` 로 부분 성공.
 *
 * 종목당 시세 + (prod 시) 메타를 합성. 시세 성공 + 메타 실패 → fallback name 디그레이드.
 * 시세 자체가 실패한 종목만 결과에서 제외한다.
 */
async function fetchWatchlistSettled(
  tickers: string[],
  metaEnabled: boolean,
): Promise<WatchlistQuote[]> {
  const results = await Promise.allSettled(
    tickers.map((ticker) => fetchOneQuote(ticker, metaEnabled)),
  );
  return results
    .filter(
      (r): r is PromiseFulfilledResult<WatchlistQuote> =>
        r.status === "fulfilled",
    )
    .map((r) => r.value);
}

/** 한 종목 합성 — 시세 필수(실패 시 throw), 메타는 best-effort(실패 시 fallback name). */
async function fetchOneQuote(
  ticker: string,
  metaEnabled: boolean,
): Promise<WatchlistQuote> {
  const [priceSettled, infoSettled] = await Promise.allSettled([
    fetchStockPrice(ticker),
    metaEnabled
      ? fetchStockInfo(ticker)
      : Promise.reject(new Error("__META_DISABLED__")),
  ]);

  // 시세 실패 → 종목 전체 실패(상위에서 제외).
  if (priceSettled.status !== "fulfilled") {
    throw priceSettled.reason;
  }
  const price = priceSettled.value;

  const info =
    infoSettled.status === "fulfilled" ? infoSettled.value : undefined;
  return composeQuote(ticker, price, info);
}

/** 시세 + 메타(있으면) → WatchlistQuote. 메타 없으면 종목명 fallback(시드 name → ticker). */
function composeQuote(
  ticker: string,
  price: StockPrice,
  info: StockInfo | undefined,
): WatchlistQuote {
  return {
    ticker,
    name: info?.name ?? fallbackName(ticker),
    market: info?.market,
    price: price.price,
    change: price.change,
    changePercent: price.changePercent,
    direction: price.direction,
    volume: price.volume,
    open: price.open,
    high: price.high,
    low: price.low,
    isTradeStopped: info?.isTradeStopped,
    isAdminItem: info?.isAdminItem,
  };
}

/**
 * 메타 미동봉 시 종목명 fallback — symbols.json 시드 name → 없으면 ticker (§9 q3).
 * ⚠️ 시세 응답의 `extractStockName`(hts_kor_isnm prod 빈 값) 에 의존하지 않는다.
 */
function fallbackName(ticker: string): string {
  const [match] = searchSymbols(ticker);
  if (match && match.ticker === ticker) return match.name;
  return ticker;
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

function mapErrorToResponse(
  error: unknown,
  tickers: string[],
  truncated: boolean,
): NextResponse {
  const headers: Record<string, string> = { "X-KIS-Env": resolveKisEnv() };
  if (truncated) headers["X-Watchlist-Truncated"] = `soft-cap-${SOFT_CAP}`;

  // 타임아웃 → mock fallback (graceful degrade) + 한글 안내.
  if (error instanceof Error && error.message === "__BFF_TIMEOUT__") {
    return jsonWithDataSource(getMockWatchlist(tickers), "mock-timeout", {
      ...headers,
      "X-Error": FALLBACK_TIMEOUT_MESSAGE,
    });
  }

  // 전부 실패 → 한글 fallback (mock 노출 대신 명시적 에러로 화면 분기 가능).
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
