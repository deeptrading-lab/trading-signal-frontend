/**
 * 시황 레이어 — `MarketSnapshot` mock (비-prod degrade).
 *
 * PRD `market-snapshot` AC-6. KIS 미설정/비-prod 환경에서 `/api/market/snapshot` 이 200 으로
 * 스키마를 만족하는 mock 을 반환해 로컬 개발·소비자 회귀 0 을 보장한다. 지수는 기존
 * `getMockMarketIndices` 를 재사용하고, 나머지 섹션은 형태 확인용 소량 정적 데이터.
 */

import { getMockMarketIndices } from "@/lib/mock/market/indices";
import { BASKETS_AS_OF } from "@/lib/market/baskets";
import type { IndexBlock, MarketSnapshot } from "@/lib/market/types";
import type { MarketIndexQuote } from "@/lib/api/kis";

function toIndexBlock(q: MarketIndexQuote): IndexBlock {
  const block: IndexBlock = {
    code: q.code,
    name: q.name,
    value: q.value,
    change: q.change,
    changePercent: q.changePercent,
    direction: q.direction,
    yearHigh: q.yearHigh,
    yearLow: q.yearLow,
  };
  if (q.yearHigh != null && q.yearLow != null && q.yearHigh > q.yearLow) {
    block.pos52w = Math.round(((q.value - q.yearLow) / (q.yearHigh - q.yearLow)) * 100) / 100;
    block.pctFrom52wHigh = Math.round(((q.value - q.yearHigh) / q.yearHigh) * 10000) / 100;
  }
  return block;
}

export function getMockMarketSnapshot(): MarketSnapshot {
  const domestic = getMockMarketIndices(["0001", "1001", "2001"]).map(toIndexBlock);
  const overseas = getMockMarketIndices(["SPX", "COMP"]).map(toIndexBlock);

  return {
    asOf: new Date().toISOString(),
    session: "closed",
    dataSource: "mock",
    indices: { domestic, overseas },
    breadth: {
      advances: 520,
      declines: 360,
      unchanged: 90,
      advanceDeclineRatio: 0.59,
      breadthPct: 53.6,
    },
    sectors: [
      {
        key: "semiconductor",
        label: "반도체",
        changePct: 1.8,
        upCount: 8,
        downCount: 3,
        memberCount: 11,
        leaders: [
          { ticker: "000660", name: "SK하이닉스", changePct: 3.2 },
          { ticker: "005930", name: "삼성전자", changePct: 1.5 },
        ],
        weightMode: "equal",
      },
      {
        key: "battery",
        label: "2차전지",
        changePct: -0.9,
        upCount: 3,
        downCount: 7,
        memberCount: 10,
        leaders: [{ ticker: "373220", name: "LG에너지솔루션", changePct: 0.4 }],
        weightMode: "equal",
      },
    ],
    concentration: {
      basis: "kospi_top_mcap",
      topN: 5,
      topNContributionPct: 71.4,
      direction: "up",
      contributors: [
        { ticker: "005930", name: "삼성전자", changePct: 1.5, weight: 0.42, contribution: 0.63 },
        { ticker: "000660", name: "SK하이닉스", changePct: 3.2, weight: 0.15, contribution: 0.48 },
      ],
      interpretation: "very_narrow",
      asOf: BASKETS_AS_OF,
    },
    regime: {
      trend: "pullback",
      aboveMA: { ma20: false, ma60: true, ma120: true },
      maSlope120: "up",
      momentum: { d5: -1.2, d20: 2.4 },
      riskLevel: "elevated",
      rationale: "상승추세 내 조정(120선 우상향, 20일 +2.4%, 시장폭 54%) · 리스크 elevated",
      bars: 245,
    },
    fearGreed: {
      domestic: { value: 56, label: "GREED" },
      us: null,
    },
    flow: {
      foreignTop: [
        { ticker: "000660", name: "SK하이닉스", changePercent: 3.2, netBuyAmount: 152000 },
      ],
      institutionTop: [
        { ticker: "005930", name: "삼성전자", changePercent: 1.5, netBuyAmount: 88000 },
      ],
    },
    warnings: ["mock 데이터(비-prod) — 실제 시장과 무관"],
  };
}
