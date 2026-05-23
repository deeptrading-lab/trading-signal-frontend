/**
 * Home 시장 정보 그리드 mock — 6 항목.
 *
 * 시안 `StatsGrid.tsx` 의 6 항목 정합 — 시가총액 / 24시간 거래대금 / 유통량 / 52주 최고가 / 52주 최저가 / 도미넌스.
 *
 * 값(value) 의 한글 단위 표기(예: "1,750조 340억") 는 데이터 표기로 간주 — 카피가 아니라
 * 한국식 큰 숫자 표기 컨벤션. 라벨 한글은 `lib/copy/home/labels.ts` 의 `MARKET_STAT_*`.
 */

import type { MarketStats } from "@/lib/types/home/marketStats";

export const MARKET_STATS_MOCK: MarketStats = [
  { key: "MARKET_CAP", value: "1,750조 340억" },
  { key: "VOLUME_24H", value: "32조 5,400억" },
  { key: "CIRCULATING_SUPPLY", value: "19,650,230 BTC" },
  { key: "HIGH_52W", value: "101,200,000" },
  { key: "LOW_52W", value: "38,400,000" },
  { key: "DOMINANCE", value: "52.4%" },
];
