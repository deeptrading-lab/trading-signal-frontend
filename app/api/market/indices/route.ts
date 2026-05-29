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
 */

import { NextRequest, NextResponse } from "next/server";
import {
  fetchIndexPrice,
  isKisConfigured,
  resolveKisEnv,
  type MarketIndexQuote,
} from "@/lib/api/kis";
import { isApiError } from "@/lib/api/errors";
import { getMockMarketIndices } from "@/lib/mock/market/indices";

/** 국내 지수 기본 3종 — KOSPI / KOSDAQ / KOSPI200. */
const DEFAULT_INDEX_CODES = ["0001", "1001", "2001"] as const;

const FALLBACK_TIMEOUT_MESSAGE =
  "KIS 서버 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.";
const FALLBACK_SERVER_MESSAGE =
  "지수 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";

export async function GET(request: NextRequest) {
  const codes = parseCodes(request.nextUrl.searchParams.getAll("codes"));

  // 이중 게이트 — 미설정 또는 prod 가 아니면 KIS 실호출을 시도하지 않고 mock.
  if (!isKisConfigured() || resolveKisEnv() !== "prod") {
    return jsonWithDataSource(getMockMarketIndices(codes), "mock", {
      "X-KIS-Env": resolveKisEnv(),
    });
  }

  try {
    const data = await withTimeout(fetchIndicesSettled(codes), 5_000);
    // 전부 실패 → 비즈니스/네트워크 에러로 fallback 처리.
    if (data.length === 0) {
      return mapErrorToResponse(new Error("__ALL_FAILED__"), codes);
    }
    return jsonWithDataSource(data, "kis", {
      "X-KIS-Env": resolveKisEnv(),
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

/** 병렬 호출 후 성공분(fulfilled)만 반환 — 부분 성공 (PRD §3.3 q4). */
async function fetchIndicesSettled(
  codes: string[],
): Promise<MarketIndexQuote[]> {
  const results = await Promise.allSettled(
    codes.map((code) => fetchIndexPrice(code)),
  );
  return results
    .filter(
      (r): r is PromiseFulfilledResult<MarketIndexQuote> =>
        r.status === "fulfilled",
    )
    .map((r) => r.value);
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
