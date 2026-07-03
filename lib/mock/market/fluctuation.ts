/**
 * 등락률 순위(급상승/급하락) mock — KIS 미설정/비-prod/타임아웃 시 BFF fallback (레이아웃·로컬 demo 용).
 *
 * `direction="up"` 이면 상승 종목(등락률 내림차순), `"down"` 이면 하락 종목(등락률 오름차순)을 돌려준다.
 */

import type {
  FluctuationDirection,
  FluctuationResponse,
  FluctuationRow,
} from "@/lib/types/market/fluctuation";

const MOCK_UP: FluctuationRow[] = [
  { ticker: "096770", name: "SK이노베이션", price: 128500, changePercent: 12.4, direction: "up" },
  { ticker: "011200", name: "HMM", price: 21850, changePercent: 9.8, direction: "up" },
  { ticker: "066570", name: "LG전자", price: 98700, changePercent: 7.6, direction: "up" },
  { ticker: "010140", name: "삼성중공업", price: 14320, changePercent: 6.1, direction: "up" },
  { ticker: "047810", name: "한국항공우주", price: 62400, changePercent: 4.9, direction: "up" },
  { ticker: "003670", name: "포스코퓨처엠", price: 241000, changePercent: 3.3, direction: "up" },
];

const MOCK_DOWN: FluctuationRow[] = [
  { ticker: "247540", name: "에코프로비엠", price: 132900, changePercent: -11.7, direction: "down" },
  { ticker: "091990", name: "셀트리온헬스케어", price: 68300, changePercent: -8.4, direction: "down" },
  { ticker: "068270", name: "셀트리온", price: 174200, changePercent: -6.9, direction: "down" },
  { ticker: "035900", name: "JYP Ent.", price: 61800, changePercent: -5.2, direction: "down" },
  { ticker: "058470", name: "리노공업", price: 158900, changePercent: -4.1, direction: "down" },
  { ticker: "022100", name: "포스코DX", price: 41250, changePercent: -3.0, direction: "down" },
];

export function getMockFluctuation(
  direction: FluctuationDirection = "up",
): FluctuationResponse {
  return {
    rows: direction === "down" ? MOCK_DOWN : MOCK_UP,
    direction,
    asOf: new Date().toISOString(),
  };
}
