/**
 * 표면 B — 종목별 개인/외국인/기관 최근 N일 순매수 추이 mock.
 *
 * PRD `investor-flow` §4.B / §6.3 — BFF(`/api/stock/investors`)가 KIS 미설정·타임아웃·실패 시
 * 반환하는 데이터 모델 fallback. 개발·preview 레이아웃 검증용(`X-Data-Source: mock`).
 *
 * 최근 ~15 영업일 가짜(최신이 [0]). 음수(순매도) 부호 포함. 거래대금 단위는 도메인 모델과 동일
 * 백만원. mock 안에 사용자 노출 한글 카피 0건 — ticker 같은 식별자만(frontend.md §3).
 */

import type {
  StockInvestorDay,
  StockInvestorTrend,
} from "@/lib/types/stock/investors";

/** mock 일수 — 화면 절단 전 데이터 모델 fixture 길이. */
const MOCK_DAYS = 15;

/** ticker 문자열 → 결정적 시드(같은 종목은 같은 mock). */
function seedFromTicker(ticker: string): number {
  let acc = 0;
  for (let i = 0; i < ticker.length; i += 1) {
    acc = (acc * 31 + ticker.charCodeAt(i)) % 100_000;
  }
  return acc;
}

/** 시드 + 인덱스 → 유사난수 [-1, 1). */
function pseudo(seed: number, i: number): number {
  const x = Math.sin(seed * 12.9898 + i * 78.233) * 43_758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

/** 최신 영업일에서 i일 전 날짜(주말 건너뜀) → YYYY-MM-DD. */
function businessDateBefore(i: number): string {
  const d = new Date();
  let remaining = i;
  while (remaining > 0 || d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) remaining -= 1;
  }
  return d.toISOString().slice(0, 10);
}

export function getMockStockInvestors(ticker: string): StockInvestorTrend {
  const seed = seedFromTicker(ticker || "000000");
  const basePrice = 50_000 + (seed % 50) * 1_000;

  const days: StockInvestorDay[] = Array.from({ length: MOCK_DAYS }, (_, i) => {
    const r = pseudo(seed, i);
    const close = Math.round(basePrice * (1 + pseudo(seed, i + 100) * 0.03));
    // 개인은 외국인·기관과 대체로 반대 방향(수급 합 ≈ 0 근사).
    const foreignAmt = Math.round(pseudo(seed, i + 1) * 8_000);
    const orgAmt = Math.round(pseudo(seed, i + 2) * 5_000);
    const personAmt = -(foreignAmt + orgAmt);
    const toQty = (amt: number) => Math.round((amt * 1_000_000) / close);

    return {
      date: businessDateBefore(i),
      close,
      changeSign: r >= 0 ? "2" : "5",
      personNetBuyAmount: personAmt,
      personNetBuyQty: toQty(personAmt),
      foreignNetBuyAmount: foreignAmt,
      foreignNetBuyQty: toQty(foreignAmt),
      orgNetBuyAmount: orgAmt,
      orgNetBuyQty: toQty(orgAmt),
    } satisfies StockInvestorDay;
  });

  return { days };
}
