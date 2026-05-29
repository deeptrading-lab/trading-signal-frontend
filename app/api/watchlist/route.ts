/**
 * `/api/watchlist` BFF route — 관심종목 일괄 시세 조회.
 *
 * 브라우저 → 본 route handler → KIS REST 단방향. 직접 호출 금지 (AGENTS.md BFF 원칙).
 *
 * PRD `watchlist-batch-quotes` §3.2 — 종목당 시세+메타 **2N콜** 합성을 폐기하고
 * `intstock_multprice` **일괄 1콜**(N>30 시 ⌈N/30⌉ 청크)로 교체:
 *   - GET ?tickers=005930,000660 (또는 반복 ?tickers=005930&tickers=000660). 빈값 → 빈 배열(200).
 *   - **soft cap 30** — 초과분 truncate + `X-Watchlist-Truncated` 헤더(§3.2, 1콜 보장).
 *   - **이중 게이트(§9 q1)** — `isKisConfigured()` AND `resolveKisEnv()==="prod"` 통과 시에만 KIS 실호출.
 *     `intstock_multprice` 는 모의(vts) 검증 전이라 보수적으로 prod 전용. 그 외엔 mock fallback.
 *   - **로드 시 종목명 메타 호출 0** — 종목명은 클라 store/시드가 해결. BFF 응답 `name` 은
 *     일괄응답에 없으므로 시드 fallback(`getSymbolName`) → ticker 로만 채운다. 클라가 store name 으로 덮음.
 *   - **부분 성공** — 일괄 응답에 일부 ticker 누락 가능 → 받은 종목만 반환(프론트가 좌조인 디그레이드).
 *     누락 ticker 는 `X-Watchlist-Failed` 헤더로 노출(진단용).
 *   - **transient 1회 재시도** — rate-limit(EGW00201)/네트워크성 단일 콜 실패 시 짧은 backoff 후 1회.
 *   - 5s 타임아웃 가드, 4xx 메시지 통과, 5xx/전체실패 한글 fallback, `Cache-Control: no-store`.
 *   - `X-Data-Source` (kis/mock/mock-timeout) + `X-KIS-Env` 헤더.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  fetchIntstockMultprice,
  getSymbolName,
  isKisConfigured,
  resolveKisEnv,
  type WatchlistQuote,
} from "@/lib/api/kis";
import { isApiError, type ApiError } from "@/lib/api/errors";
import { getMockWatchlist } from "@/lib/mock/watchlist/quotes";

/** 관심종목 soft cap — 초과분 truncate (§3.2, 1콜 보장). */
const SOFT_CAP = 30;

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

  // 이중 게이트 — 미설정 또는 prod 가 아니면 KIS 실호출을 시도하지 않고 mock.
  if (!isKisConfigured() || resolveKisEnv() !== "prod") {
    return jsonWithDataSource(getMockWatchlist(tickers), "mock", extraHeaders);
  }

  try {
    const quotes = await withTimeout(
      withRetry(() => fetchIntstockMultprice(tickers)),
      5_000,
    );
    // 전체 실패(빈 응답·전 청크 실패) → 비즈니스/네트워크 에러 fallback.
    if (quotes.length === 0) {
      return mapErrorToResponse(new Error("__ALL_FAILED__"), tickers, truncated);
    }
    // 일괄응답 누락 ticker → 헤더로 노출(프론트 좌조인 디그레이드 + 진단).
    const missing = findMissing(tickers, quotes);
    if (missing.length > 0) {
      extraHeaders["X-Watchlist-Failed"] = missing.join(",");
    }
    return jsonWithDataSource(applyNameFallback(quotes), "kis", extraHeaders);
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

/** 입력 tickers 중 일괄응답에 없는 종목코드(누락분). */
function findMissing(tickers: string[], quotes: WatchlistQuote[]): string[] {
  const present = new Set(quotes.map((q) => q.ticker));
  return tickers.filter((t) => !present.has(t));
}

/**
 * 종목명 fallback — 일괄응답엔 신뢰 가능한 종목명이 없으므로 시드 name → ticker 로 채운다(§3.2).
 * 클라이언트가 store name 으로 최종 표시명을 덮으므로 BFF name 은 식별 폴백 역할.
 * ⚠️ 종목명 메타 API(`hts_kor_isnm`/`bstp_kor_isnm` 등)를 사용하지 않는다.
 */
function applyNameFallback(quotes: WatchlistQuote[]): WatchlistQuote[] {
  return quotes.map((q) => ({
    ...q,
    name: getSymbolName(q.ticker) ?? q.ticker,
  }));
}

/**
 * transient(rate-limit/네트워크성) 실패 시 짧은 backoff 후 1회 재시도(단일 일괄 콜 단위).
 * 비즈니스 에러(잘못된 종목코드 등)는 즉시 throw — 재시도 무의미.
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
