/**
 * 표면 A — 외국인/기관 순매수 Top10 mock.
 *
 * PRD `investor-flow` §4.A / §6.3 — BFF(`/api/flow/top10`)가 이중게이트 미충족·타임아웃·실패 시
 * 반환하는 데이터 모델 fallback. 개발·preview 레이아웃 검증용(`X-Data-Source: mock`).
 *
 * mock 안에 사용자 노출 한글 카피는 0건 — 종목명·코드 같은 식별자만(frontend.md §3).
 * `netBuyAmount` 단위는 도메인 모델과 동일하게 **백만원**(표시 환산은 프론트). 거래대금 내림차순 정렬.
 */

import type {
  InvestorFlowRow,
  InvestorFlowTop10,
} from "@/lib/types/flow/top10";

/** 그럴듯한 시드 종목(코드·이름·현재가·등락률). */
const SEED: Array<{
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
}> = [
  { ticker: "005930", name: "삼성전자", price: 78_400, changePercent: 1.82 },
  { ticker: "000660", name: "SK하이닉스", price: 201_500, changePercent: 2.74 },
  { ticker: "373220", name: "LG에너지솔루션", price: 412_000, changePercent: -0.84 },
  { ticker: "207940", name: "삼성바이오로직스", price: 812_000, changePercent: 0.62 },
  { ticker: "005380", name: "현대차", price: 248_500, changePercent: 1.13 },
  { ticker: "000270", name: "기아", price: 119_800, changePercent: -0.42 },
  { ticker: "068270", name: "셀트리온", price: 187_300, changePercent: 0.91 },
  { ticker: "035420", name: "NAVER", price: 168_900, changePercent: -1.21 },
  { ticker: "035720", name: "카카오", price: 41_250, changePercent: 0.36 },
  { ticker: "105560", name: "KB금융", price: 86_700, changePercent: 1.55 },
  { ticker: "012330", name: "현대모비스", price: 232_000, changePercent: 0.74 },
  { ticker: "051910", name: "LG화학", price: 318_500, changePercent: -0.58 },
];

/** changePercent 부호 → direction. */
function directionFromPercent(
  changePercent: number,
): InvestorFlowRow["direction"] {
  if (changePercent > 0) return "up";
  if (changePercent < 0) return "down";
  return "flat";
}

/**
 * 주체별 10행 생성. `seedOffset` 으로 외국인/기관이 서로 다른 종목 구성을 갖게 한다.
 * 거래대금(백만원) 내림차순 — 시드 인덱스 기반 그럴듯한 가짜.
 */
function buildRows(seedOffset: number, scale: number): InvestorFlowRow[] {
  return Array.from({ length: 10 }, (_, i) => {
    const seed = SEED[(i + seedOffset) % SEED.length];
    // 상위일수록 큰 거래대금(백만원). 가짜지만 정렬 단조성 보장.
    const netBuyAmount = Math.round((10 - i) * scale * 1_000);
    const netBuyQty = Math.round(
      (netBuyAmount * 1_000_000) / Math.max(seed.price, 1),
    );
    return {
      ticker: seed.ticker,
      name: seed.name,
      price: seed.price,
      changePercent: seed.changePercent,
      direction: directionFromPercent(seed.changePercent),
      netBuyAmount,
      netBuyQty,
    } satisfies InvestorFlowRow;
  });
}

/** 외국인·기관 각 10행 mock Top10. asOf 는 현재 시각(기준 시각 표기 검증용). */
export function getMockInvestorFlowTop10(): InvestorFlowTop10 {
  return {
    foreign: buildRows(0, 1.2),
    institution: buildRows(3, 0.9),
    asOf: new Date().toISOString(),
  };
}
