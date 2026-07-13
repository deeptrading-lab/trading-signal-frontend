/**
 * `/api/market/exchange-rate` BFF route — 환율(미국 종목 원화 환산, us-stock-support).
 *
 * 브라우저 → 본 route → 토스 REST 단방향(BFF 원칙). 토스 전용(KIS 폴백 없음). 부가 정보라
 * fail-soft — 키 미설정·실패·타임아웃 전부 `rate: null` + 200(헤더 렌더를 막지 않는다).
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchExchangeRate } from "@/lib/api/toss/exchangeRate";
import { isTossConfigured } from "@/lib/api/toss/client";
import { withTimeout, jsonWithDataSource } from "@/lib/server/bffUtils";
import type { ExchangeRateResponse } from "@/lib/types/market/exchangeRate";

const BFF_TIMEOUT_MS = 5_000;
const CURRENCY_RE = /^[A-Z]{3}$/;

export async function GET(request: NextRequest) {
  const base = (request.nextUrl.searchParams.get("base") ?? "USD").trim().toUpperCase();
  const quote = (request.nextUrl.searchParams.get("quote") ?? "KRW").trim().toUpperCase();

  if (!CURRENCY_RE.test(base) || !CURRENCY_RE.test(quote)) {
    return NextResponse.json(
      { error: "base·quote 는 3자리 통화코드여야 합니다(예: USD, KRW)." },
      { status: 400 },
    );
  }

  if (!isTossConfigured()) {
    return jsonWithDataSource({ base, quote, rate: null } satisfies ExchangeRateResponse, "none");
  }

  try {
    const rate = await withTimeout(fetchExchangeRate(base, quote), BFF_TIMEOUT_MS);
    return jsonWithDataSource(
      { base, quote, rate } satisfies ExchangeRateResponse,
      rate != null ? "toss" : "none",
    );
  } catch {
    // withTimeout 초과가 유일 경로(로더 never-throw) — null degrade.
    return jsonWithDataSource({ base, quote, rate: null } satisfies ExchangeRateResponse, "none");
  }
}
