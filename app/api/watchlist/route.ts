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
 *   - **부분 성공** — 종목별·API별 `Promise.allSettled`. 시세 성공 + 메타 실패면 fallback name 으로 디그레이드.
 *   - 5s 타임아웃 가드, 4xx 메시지 통과, 5xx/전체실패 한글 fallback, `Cache-Control: no-store`.
 *   - `X-Data-Source` (kis/mock/mock-timeout) + `X-KIS-Env` 헤더.
 *
 * ## fix `watchlist-real-data` — rate-limit 부분실패 완화 (데이터 계층)
 *   - **동시성 제한**: 무제한 `Promise.allSettled(tickers.map(...))` 가 prod KIS 초당 거래건수 한도를
 *     넘겨(종목당 시세+메타 2콜) 일부 시세 콜을 떨어뜨리던 문제 → 동시 실행 수를 `CONCURRENCY`(2) 로 제한.
 *   - **transient 재시도**: 시세/메타 호출이 rate-limit(KIS `EGW00201` "초당 거래건수 초과") 또는
 *     네트워크성(transport) 실패면 짧은 backoff 후 1회 재시도. 비즈니스 에러(잘못된 종목코드 등)는 재시도 안 함.
 *   - **실패 ticker 노출**: 전부 drop 하지 않고 성공분만 안정 반환. 시세 실패 종목은 `X-Watchlist-Failed`
 *     헤더(콤마 구분)로 프론트에 알려 "재시도" UX 에 활용 가능하게 한다.
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
import { isApiError, type ApiError } from "@/lib/api/errors";
import { getMockWatchlist } from "@/lib/mock/watchlist/quotes";
import type { WatchlistQuote } from "@/lib/api/watchlist/list";

/** 관심종목 soft cap — 초과분 truncate (§3.3). */
const SOFT_CAP = 30;

/**
 * 동시 실행 종목 수. 종목당 내부 시세+메타 2콜이라 실효 동시 KIS 콜 ≈ 2*CONCURRENCY.
 * prod KIS 초당 거래건수 한도(보수적)에 맞춰 소량(2)으로 제한. 과도한 throttle 로 체감 지연 X.
 */
const CONCURRENCY = 2;

/** transient 실패 1회 재시도 backoff (ms). 초당 한도 회복 여지를 두되 체감 지연은 최소. */
const RETRY_BACKOFF_MS = 200;

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
    const { quotes, failed } = await withTimeout(
      fetchWatchlistSettled(tickers, metaEnabled),
      5_000,
    );
    // 전부 실패 → 비즈니스/네트워크 에러 fallback.
    if (quotes.length === 0) {
      return mapErrorToResponse(
        failed[0]?.reason ?? new Error("__ALL_FAILED__"),
        tickers,
        truncated,
      );
    }
    // 부분 실패 종목은 헤더로 노출 — 프론트가 좌조인 + 재시도 UX 에 활용.
    if (failed.length > 0) {
      extraHeaders["X-Watchlist-Failed"] = failed.map((f) => f.ticker).join(",");
    }
    return jsonWithDataSource(quotes, "kis", extraHeaders);
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

type WatchlistFailure = { ticker: string; reason: unknown };
type WatchlistSettled = {
  quotes: WatchlistQuote[];
  failed: WatchlistFailure[];
};

/**
 * 종목 합성 — 동시성 제한 풀로 부분 성공 + 실패 ticker 수집.
 *
 * 무제한 fan-out 대신 동시 `CONCURRENCY` 종목만 실행 → prod KIS 초당 거래건수 한도 완화.
 * 종목당 시세 + (prod 시) 메타를 합성. 시세 성공 + 메타 실패 → fallback name 디그레이드.
 * 시세 자체가 실패한 종목은 결과에서 제외하고 `failed` 에 사유와 함께 기록한다.
 */
async function fetchWatchlistSettled(
  tickers: string[],
  metaEnabled: boolean,
): Promise<WatchlistSettled> {
  const quotes: WatchlistQuote[] = [];
  const failed: WatchlistFailure[] = [];

  // 입력 ticker 순서 보존을 위해 인덱스 슬롯에 채운 뒤 정렬 추출.
  const slots = new Array<WatchlistQuote | undefined>(tickers.length);
  await runWithConcurrency(tickers, CONCURRENCY, async (ticker, index) => {
    try {
      slots[index] = await fetchOneQuote(ticker, metaEnabled);
    } catch (reason) {
      failed.push({ ticker, reason });
    }
  });

  for (const slot of slots) {
    if (slot) quotes.push(slot);
  }
  return { quotes, failed };
}

/**
 * 동시 실행 수를 `limit` 으로 제한하는 작은 풀 — 외부 라이브러리 없이.
 * 워커 `limit` 개가 공유 커서에서 다음 인덱스를 집어 처리. 모든 작업은 throw 하지 않게 worker 내부에서 처리.
 */
async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const size = Math.max(1, Math.min(limit, items.length || 1));
  const runners = Array.from({ length: size }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
}

/** 한 종목 합성 — 시세 필수(실패 시 throw), 메타는 best-effort(실패 시 fallback name). 둘 다 transient 1회 재시도. */
async function fetchOneQuote(
  ticker: string,
  metaEnabled: boolean,
): Promise<WatchlistQuote> {
  const [priceSettled, infoSettled] = await Promise.allSettled([
    withRetry(() => fetchStockPrice(ticker)),
    metaEnabled
      ? withRetry(() => fetchStockInfo(ticker))
      : Promise.reject(new Error("__META_DISABLED__")),
  ]);

  // 시세 실패 → 종목 전체 실패(상위에서 제외 + failed 기록).
  if (priceSettled.status !== "fulfilled") {
    throw priceSettled.reason;
  }
  const price = priceSettled.value;

  const info =
    infoSettled.status === "fulfilled" ? infoSettled.value : undefined;
  return composeQuote(ticker, price, info);
}

/**
 * transient(rate-limit/네트워크성) 실패 시 짧은 backoff 후 1회 재시도.
 * 비즈니스 에러(잘못된 종목코드 등)·메타 비활성 sentinel 은 즉시 throw — 재시도 무의미.
 */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (!isTransientError(error)) throw error;
    await delay(RETRY_BACKOFF_MS);
    return fn(); // 2번째 실패는 그대로 전파.
  }
}

/**
 * 재시도 가능한 transient 실패인지 판별.
 *   - transport 실패(no-response/타임아웃/5xx) → `ApiError.kind === "network"`.
 *   - KIS rate-limit 비즈니스 에러 → `msg_cd === "EGW00201"` 또는 메시지에 "초당 거래건수".
 * 그 외(잘못된 종목코드 등 비즈니스 에러)는 재시도 안 함.
 */
function isTransientError(error: unknown): boolean {
  if (!isApiError(error)) return false;
  if (error.kind === "network") return true;
  return isRateLimitError(error);
}

function isRateLimitError(error: ApiError): boolean {
  const detail = error.detail as { msg_cd?: unknown } | undefined;
  const msgCd =
    detail && typeof detail.msg_cd === "string" ? detail.msg_cd : undefined;
  if (msgCd === "EGW00201") return true;
  return (
    typeof error.message === "string" &&
    error.message.includes("초당 거래건수")
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
