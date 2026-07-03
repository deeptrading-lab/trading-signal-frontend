/**
 * `/api/stock/warnings/batch` BFF route — 여러 종목의 매수 유의사항 한 번에.
 *
 * PRD `intraday-warnings` §3-1. 단타 워치 표·추천 후보 칩이 가시 티커 union 으로 1회 호출한다.
 * 브라우저 → 본 route handler → 토스 REST(BFF 원칙). 토스 전용(KIS 폴백 없음) — 키 미설정이면
 * 빈 맵 + `X-Data-Source: none`(동료 로컬 무영향).
 *
 * `?tickers=a,b,c` (쉼표 구분). 최대 `MAX_TICKERS` 캡(초과분은 로그 후 절단 — 무음 절단 금지).
 * `fetchActiveWarningsBatch` 가 동시성 제한(5/s 준수) + 60s 캐시 + never-throw 를 담당.
 */

import { NextRequest } from "next/server";
import {
  fetchActiveWarningsBatch,
  isValidWarningsSymbol,
} from "@/lib/api/toss/warnings";
import { isTossConfigured } from "@/lib/api/toss/client";
import type { StockWarningsBatchResponse } from "@/lib/types/stock/warnings";
import { withTimeout, jsonWithDataSource } from "@/lib/server/bffUtils";

/**
 * 한 번에 조회할 티커 상한 — 단타 워치 화면의 최대 가시 union 을 덮는다:
 * 저장 워치(≤20) + 수급 후보(≤14) + 거래량 후보(≤14) = 최대 ~48. 이보다 낮으면 union 초과 시
 * **뒤쪽(거래량 후보)이 먼저 잘려** 경보가 밀집한 그룹의 배지가 조용히 사라진다(리뷰 F-2). 50 으로
 * 상향해 정상 사용 범위를 전부 덮되, 초과분은 여전히 로그 후 절단(무음 절단 금지).
 * 콜드 캐시 첫 로드는 동시성 5 로 나눠 fan-out(60s 캐시가 이후 흡수, fail-soft·백그라운드).
 */
const MAX_TICKERS = 50;
const BFF_TIMEOUT_MS = 6_000;

export async function GET(request: NextRequest) {
  const raw = (request.nextUrl.searchParams.get("tickers") ?? "").trim();
  const requested = raw
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter((t) => isValidWarningsSymbol(t));

  const empty: StockWarningsBatchResponse = { warnings: {} };
  if (requested.length === 0) {
    return jsonWithDataSource(empty, isTossConfigured() ? "toss" : "none");
  }
  if (!isTossConfigured()) {
    return jsonWithDataSource(empty, "none");
  }

  // 캡 초과는 조용히 버리지 않고 로그로 남긴다(관측성).
  const unique = [...new Set(requested)];
  const capped = unique.slice(0, MAX_TICKERS);
  if (unique.length > MAX_TICKERS) {
    console.warn(
      `[stock/warnings/batch] 티커 ${unique.length}개 요청 → ${MAX_TICKERS}개로 절단`,
    );
  }

  try {
    const warnings = await withTimeout(
      fetchActiveWarningsBatch(capped),
      BFF_TIMEOUT_MS,
    );
    return jsonWithDataSource(
      { warnings } satisfies StockWarningsBatchResponse,
      "toss",
    );
  } catch {
    // withTimeout 초과가 유일 경로(배치는 never-throw) — 빈 맵 fail-soft.
    return jsonWithDataSource(empty, "toss-timeout");
  }
}
