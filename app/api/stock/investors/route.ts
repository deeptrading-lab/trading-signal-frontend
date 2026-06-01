/**
 * `/api/stock/investors` BFF route — 표면 B 종목별 개인/외국인/기관 최근 N일 순매수 추이.
 *
 * 브라우저 → 본 route handler → KIS REST 단방향. 직접 호출 금지 (AGENTS.md BFF 원칙).
 *
 * PRD `investor-flow` §4.B / §6.2 / §6.3:
 *   - GET ?ticker=005930. 빈 ticker → mock(빈 화면 방지).
 *   - **느슨한 게이트** — `inquire-investor`(`FHKST01010900`)는 실전·모의 둘 다 동작(TR_ID 동일).
 *     따라서 prod 이중게이트가 아니라 `isKisConfigured()` 만 충족하면 실호출(env 무관).
 *     미설정 시 mock fallback(`X-Data-Source: mock`).
 *   - **최근 N일 slice** — API 가 주는 만큼 받되 화면 과밀 방지로 최근 N일(MAX_DAYS)로 절단.
 *   - `withTimeout`·`jsonWithDataSource`·`BFF_TIMEOUT_SENTINEL` 재사용(`bffUtils`).
 *   - 타임아웃 → mock-timeout fallback + 한글 안내, 실패 → 한글 502, `Cache-Control: no-store`.
 *   - `X-Data-Source`(kis/mock/mock-timeout) + `X-KIS-Env` 헤더.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  fetchInvestorTrend,
  isKisConfigured,
  resolveKisEnv,
} from "@/lib/api/kis";
import { isApiError } from "@/lib/api/errors";
import { getMockStockInvestors } from "@/lib/mock/stock/investors";
import type { StockInvestorTrend } from "@/lib/types/stock/investors";
import {
  withTimeout,
  jsonWithDataSource,
  BFF_TIMEOUT_SENTINEL,
} from "@/lib/server/bffUtils";

const BFF_TIMEOUT_MS = 5_000;
const MAX_DAYS = 15; // 화면 과밀 방지 — 최근 N일 절단(§9 q2 PM 권고 ~10~20일).

const FALLBACK_TIMEOUT_MESSAGE =
  "KIS 서버 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.";
const FALLBACK_SERVER_MESSAGE =
  "종목 수급 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";

export async function GET(request: NextRequest) {
  const ticker = (request.nextUrl.searchParams.get("ticker") ?? "").trim();

  // 빈 ticker → mock(빈 화면 방지).
  if (!ticker) {
    return jsonWithDataSource(getMockStockInvestors(ticker), "mock", {
      "X-KIS-Env": resolveKisEnv(),
    });
  }

  // 느슨한 게이트 — 미설정이면 mock, 설정되면 실전·모의 무관 실호출.
  if (!isKisConfigured()) {
    return jsonWithDataSource(getMockStockInvestors(ticker), "mock", {
      "X-KIS-Env": resolveKisEnv(),
    });
  }

  try {
    const trend = await withTimeout(fetchInvestorTrend(ticker), BFF_TIMEOUT_MS);
    return jsonWithDataSource(sliceDays(trend), "kis", {
      "X-KIS-Env": resolveKisEnv(),
    });
  } catch (error) {
    return mapErrorToResponse(error, ticker);
  }
}

/** 최근 N일 절단 — KIS 응답은 최신이 [0] 이므로 앞에서 slice. */
function sliceDays(trend: StockInvestorTrend): StockInvestorTrend {
  return { days: trend.days.slice(0, MAX_DAYS) };
}

function mapErrorToResponse(error: unknown, ticker: string): NextResponse {
  // 타임아웃 → mock fallback (graceful degrade) + 한글 안내.
  if (error instanceof Error && error.message === BFF_TIMEOUT_SENTINEL) {
    return jsonWithDataSource(getMockStockInvestors(ticker), "mock-timeout", {
      "X-Error": FALLBACK_TIMEOUT_MESSAGE,
      "X-KIS-Env": resolveKisEnv(),
    });
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
