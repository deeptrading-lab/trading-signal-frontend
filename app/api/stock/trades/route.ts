/**
 * `/api/stock/trades` BFF route — 최근 체결(체결강도 + 체결 테이프).
 *
 * PRD `toss-trades` §3-4. 브라우저 → 본 route handler → 토스 REST 단방향(BFF 원칙).
 *
 * 토스 전용(KIS 폴백 없음) — 키 미설정이면 빈 체결 + `X-Data-Source: none`(동료 로컬 무영향, AC-1).
 * `fetchTrades` 가 never-throw 라 형식 오류(400) 외엔 항상 200 — 체결은 부가 정보라 실패가 화면을
 * 막지 않는다(fail-soft, AC-7/AC-8).
 *
 * **파생은 서버에서 수행**: `fetchTrades`(정규화) → `deriveTradeStrength`(틱룰 강도)·`classifyTrades`
 * (테이프 side)를 route 가 호출해 완성 페이로드를 반환한다(클라 파생 부담 제거, 순수 함수 서버 테스트 용이).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_TRADES_COUNT,
  fetchTrades,
  isValidTradesSymbol,
} from "@/lib/api/toss/trades";
import {
  classifyTrades,
  deriveTradeStrength,
} from "@/lib/api/toss/tradeStrength";
import { isTossConfigured } from "@/lib/api/toss/client";
import {
  EMPTY_TRADES_RESULT,
  type TradesResult,
} from "@/lib/types/stock/trades";
import { withTimeout, jsonWithDataSource } from "@/lib/server/bffUtils";

/** route 자체 타임아웃 가드 — 초과 시 빈 체결 디그레이드(에러 아님). */
const BFF_TIMEOUT_MS = 5_000;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const ticker = (params.get("ticker") ?? "").trim();
  if (!isValidTradesSymbol(ticker)) {
    return NextResponse.json(
      { error: "ticker query parameter 가 필요합니다." },
      { status: 400 },
    );
  }

  const parsedCount = Number(params.get("count"));
  const count =
    Number.isFinite(parsedCount) && parsedCount > 0
      ? Math.min(Math.trunc(parsedCount), 100)
      : DEFAULT_TRADES_COUNT;

  if (!isTossConfigured()) {
    return jsonWithDataSource(EMPTY_TRADES_RESULT, "none");
  }

  try {
    const trades = await withTimeout(fetchTrades(ticker, count), BFF_TIMEOUT_MS);
    const classified = classifyTrades(trades);
    const result: TradesResult = {
      trades: classified,
      strength: deriveTradeStrength(trades),
      isEmpty: trades.length === 0,
      updatedAt: classified[0]?.timestamp ?? null,
    };
    return jsonWithDataSource(result, "toss");
  } catch {
    // withTimeout 초과가 유일한 경로(로더는 never-throw) — 빈 체결 fail-soft.
    return jsonWithDataSource(EMPTY_TRADES_RESULT, "toss-timeout");
  }
}
