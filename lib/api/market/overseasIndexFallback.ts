/**
 * 해외 지수(S&P 500 / NASDAQ 종합) US-friendly 폴백 소스 — Yahoo Finance chart API.
 *
 * ## 왜 필요한가 (2026-06-03 진단)
 *
 * KIS 해외 지수 엔드포인트(`inquire-daily-chartprice`, TR FHKST03030100)는 **비-한국 IP** 에서
 * 호출하면 HTTP 500 을 반환한다. 같은 요청·토큰·파라미터로 한국 IP=200 / Vercel 미 동부(iad1)=500
 * 임을 확인했다(국내 지수는 통과 — 해외 시세만 IP/리전 제한 추정). 함수 리전 고정(`preferredRegion`)
 * 은 Vercel Hobby 플랜에서 무시되므로(미 동부 고정), KIS 가 실패하면 본 폴백으로 SPX/COMP 를 채운다.
 *
 * ## 소스
 *
 * - Yahoo Finance chart API — 무키 공개 엔드포인트, US 호스팅이라 Vercel(미국)에서 정상 동작.
 * - 등락률은 **인접 두 거래일 종가**로 계산한다(`meta.chartPreviousClose` 는 조회 범위 시작 직전
 *   종가라 "전일 대비" 가 아니라 부정확 — close 배열 끝 2개를 쓴다).
 * - 값은 KIS 와 미세 차이가 있을 수 있으나(피드/스냅샷 차이) 동일 지수·방향 정합.
 * - 지수명은 `OVERSEAS_INDEX_NAME_BY_CODE` 상수(단일 진실 원천). 응답 이름 미사용.
 */

import { makeKisTransportError } from "@/lib/api/kis/errors";
import {
  OVERSEAS_INDEX_NAME_BY_CODE,
  type MarketIndexQuote,
} from "@/lib/api/kis/types";

/** 앱 해외 코드 → Yahoo 심볼. SPX=S&P 500(^GSPC) / COMP=NASDAQ 종합(^IXIC). */
const YAHOO_SYMBOL_BY_CODE: Record<string, string> = {
  SPX: "^GSPC",
  COMP: "^IXIC",
};

/** 폴백 자체 타임아웃 — BFF 5s 예산 안에서 KIS 실패 후에도 여유를 두도록 짧게. */
const FALLBACK_TIMEOUT_MS = 3_000;

type YahooChart = {
  chart?: {
    result?: Array<{
      meta?: { regularMarketPrice?: number };
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }> | null;
    error?: unknown;
  };
};

/**
 * Yahoo Finance 에서 해외 지수(SPX/COMP) 현재값·등락을 조회해 `MarketIndexQuote` 로 매핑.
 * 실패(미지원 코드/HTTP 오류/타임아웃/파싱 실패)는 `makeKisTransportError`(kind server/network)로 throw —
 * 호출 측(index-store)이 transient 로 보고 스테일 폴백/드롭 처리할 수 있게 KIS 에러와 형태를 맞춘다.
 */
export async function fetchOverseasIndexFallback(
  code: string,
): Promise<MarketIndexQuote> {
  const symbol = YAHOO_SYMBOL_BY_CODE[code];
  if (!symbol) {
    throw makeKisTransportError({
      message: `해외 지수 폴백 미지원 코드(${code})`,
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FALLBACK_TIMEOUT_MS);
  let json: YahooChart;
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        symbol,
      )}?interval=1d&range=7d`,
      {
        headers: { "user-agent": "Mozilla/5.0" },
        signal: controller.signal,
      },
    );
    if (!res.ok) {
      throw makeKisTransportError({
        status: res.status,
        message: `해외 지수 폴백 HTTP ${res.status}`,
      });
    }
    json = (await res.json()) as YahooChart;
  } catch (error) {
    // 이미 ApiError 면 그대로, 아니면(AbortError/네트워크) transport 에러로 래핑.
    if (error && typeof error === "object" && "kind" in error) throw error;
    throw makeKisTransportError({
      message:
        error instanceof Error ? error.message : "해외 지수 폴백 조회 실패",
    });
  } finally {
    clearTimeout(timer);
  }

  const result = json.chart?.result?.[0];
  const price = result?.meta?.regularMarketPrice;
  const closes = (result?.indicators?.quote?.[0]?.close ?? []).filter(
    (v): v is number => typeof v === "number",
  );
  const value = typeof price === "number" ? price : closes[closes.length - 1];
  const prev = closes[closes.length - 2];

  if (typeof value !== "number" || typeof prev !== "number" || prev === 0) {
    throw makeKisTransportError({ message: "해외 지수 폴백 응답 파싱 실패" });
  }

  const change = value - prev;
  const changePercent = (change / prev) * 100;

  return {
    code,
    name: OVERSEAS_INDEX_NAME_BY_CODE[code] ?? code,
    value,
    change,
    changePercent,
    direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
    // 해외 지수 폴백엔 누적 거래량 의미가 약해 0(헤더 티커 미사용 필드).
    volume: 0,
  };
}
