/**
 * `/api/stock/warnings` BFF route — 매수 유의사항(거래소 시장경보·VI).
 *
 * PRD `stock-warnings` §3-3. 브라우저 → 본 route handler → 토스 REST 단방향(BFF 원칙).
 *
 * 토스 전용(KIS 폴백 없음) — 키 미설정이면 빈 배열 + `X-Data-Source: none`
 * (동료 로컬 무영향, AC-1). `fetchActiveWarnings` 가 never-throw 라 형식 오류(400) 외엔
 * 항상 200 — 경보는 부가 정보라 실패가 화면을 막지 않는다(fail-soft, AC-6).
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchActiveWarnings } from "@/lib/api/toss/warnings";
import { isTossConfigured } from "@/lib/api/toss/client";
import type { StockWarningsResponse } from "@/lib/types/stock/warnings";
import {
  withTimeout,
  jsonWithDataSource,
} from "@/lib/server/bffUtils";

/** 스펙 Symbol 패턴 — 국내 6자리 + 미국 티커. */
const SYMBOL_RE = /^[A-Za-z0-9.\-]+$/;
/** route 자체 타임아웃 가드 — 초과 시 빈 배열 디그레이드(에러 아님). */
const BFF_TIMEOUT_MS = 5_000;

export async function GET(request: NextRequest) {
  const ticker = (request.nextUrl.searchParams.get("ticker") ?? "").trim();
  if (!ticker || !SYMBOL_RE.test(ticker)) {
    return NextResponse.json(
      { error: "ticker query parameter 가 필요합니다." },
      { status: 400 },
    );
  }

  if (!isTossConfigured()) {
    return jsonWithDataSource({ warnings: [] } satisfies StockWarningsResponse, "none");
  }

  try {
    const warnings = await withTimeout(fetchActiveWarnings(ticker), BFF_TIMEOUT_MS);
    return jsonWithDataSource({ warnings } satisfies StockWarningsResponse, "toss");
  } catch {
    // withTimeout 초과가 유일한 경로(로더는 never-throw) — 빈 배열 fail-soft.
    return jsonWithDataSource(
      { warnings: [] } satisfies StockWarningsResponse,
      "toss-timeout",
    );
  }
}
