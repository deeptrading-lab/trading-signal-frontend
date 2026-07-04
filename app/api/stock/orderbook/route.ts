/**
 * `/api/stock/orderbook` BFF route — 호가창(매수/매도 잔량).
 *
 * PRD `toss-orderbook` §3-3. 브라우저 → 본 route handler → 토스 REST 단방향(BFF 원칙).
 *
 * 토스 전용(KIS 폴백 없음) — 키 미설정이면 빈 호가 + `X-Data-Source: none`
 * (동료 로컬 무영향, AC-1). `fetchOrderbook` 이 never-throw 라 형식 오류(400) 외엔
 * 항상 200 — 호가는 부가 정보라 실패가 화면을 막지 않는다(fail-soft, AC-5/AC-6).
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchOrderbook, isValidOrderbookSymbol } from "@/lib/api/toss/orderbook";
import { isTossConfigured } from "@/lib/api/toss/client";
import {
  EMPTY_ORDERBOOK,
  type StockOrderbookResponse,
} from "@/lib/types/stock/orderbook";
import { withTimeout, jsonWithDataSource } from "@/lib/server/bffUtils";

/** route 자체 타임아웃 가드 — 초과 시 빈 호가 디그레이드(에러 아님). */
const BFF_TIMEOUT_MS = 5_000;

export async function GET(request: NextRequest) {
  const ticker = (request.nextUrl.searchParams.get("ticker") ?? "").trim();
  if (!isValidOrderbookSymbol(ticker)) {
    return NextResponse.json(
      { error: "ticker query parameter 가 필요합니다." },
      { status: 400 },
    );
  }

  if (!isTossConfigured()) {
    return jsonWithDataSource(
      { orderbook: EMPTY_ORDERBOOK } satisfies StockOrderbookResponse,
      "none",
    );
  }

  try {
    const orderbook = await withTimeout(fetchOrderbook(ticker), BFF_TIMEOUT_MS);
    return jsonWithDataSource(
      { orderbook } satisfies StockOrderbookResponse,
      "toss",
    );
  } catch {
    // withTimeout 초과가 유일한 경로(로더는 never-throw) — 빈 호가 fail-soft.
    return jsonWithDataSource(
      { orderbook: EMPTY_ORDERBOOK } satisfies StockOrderbookResponse,
      "toss-timeout",
    );
  }
}
