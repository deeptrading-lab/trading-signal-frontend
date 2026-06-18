/**
 * mock 종목 스냅샷 fixture — KIS 미설정/전부 실패 시 BFF(`/api/stock/snapshot`)가 반환.
 *
 * PRD `value-picks-validated` §3-A-3 — `isKisConfigured()` 미설정 시 mock + `X-Data-Source: mock`.
 * 기존 mock(가격·수급)을 재사용·조합해 완전한 스냅샷 1건을 만든다(필드 생략 없음). mock 안에 사용자
 * 노출 한글 카피 0건 — 종목명·ticker 식별자만(frontend.md §3 정합).
 */

import { getMockStockPrice } from "@/lib/mock/stock/price";
import { getMockStockInvestors } from "@/lib/mock/stock/investors";
import { aggregateInvestorTrend, nowKstIso } from "@/lib/server/stock/snapshot";
import type { StockSnapshot } from "@/lib/types/stock/snapshot";

export function getMockStockSnapshot(ticker: string): StockSnapshot {
  const price = getMockStockPrice(ticker);
  const investors = getMockStockInvestors(ticker);
  const current = price.price;
  const volume = price.volume;

  // mock 은 일봉을 만들지 않으므로 valuation52w·technical 은 산출 불가 → null(스키마 충족).
  // 시총은 mock 상장주수가 없어 null. 봇은 핵심 필드(유동성·기관 이탈)만 검증하므로 mock 에서도
  // price/investorTrend 는 채워 계약(AC-1) 을 충족한다.
  return {
    ticker,
    name: price.name,
    market: null,
    asOf: nowKstIso(),
    price: {
      current,
      changePercent: price.changePercent,
      volume,
      tradeAmountKRW: Math.round(current * volume),
    },
    valuation52w: { high: null, low: null, positionPct: null },
    marketCapKRW: null,
    foreignRatioPct: price.foreignRatio ?? null,
    technical: {
      sma5: null,
      sma20: null,
      sma60: null,
      rsi14: null,
      adx14: null,
      momentumPct: null,
      aboveSma20: null,
      aboveSma60: null,
      deadCross: null,
      trendRegime: null,
    },
    investorTrend: aggregateInvestorTrend(investors),
  };
}
