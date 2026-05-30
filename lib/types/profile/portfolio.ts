/**
 * `/profile` "내 자산" 섹션의 총자산 히어로 데이터.
 *
 * home-market-redesign PR1 — `/dashboard` 의 `Portfolio` 를 마이페이지 자산 섹션으로 이전(PRD §3.1).
 * 본 단계 = mock. 실계좌 연동 전까지 mock 유지(조회·분석 전용 스코프, PRD §4).
 *
 * 금액은 원(KRW) 정수, 비율은 백분율 숫자(예: 4.2 = +4.2%).
 * 거래성 필드(예수금/주문가능/실현손익/입출금) 미포함 — 조회·분석 전용 스코프(AC-9).
 */

export type Portfolio = {
  /** 총 자산 평가 금액 (KRW). */
  totalKrw: number;
  /** 총 투자원금 (KRW). */
  principalKrw: number;
  /** 총 평가손익 (KRW, 음수 = 손실). */
  profitKrw: number;
  /** 총 평가손익률 (백분율, 양수 = 상승 / 음수 = 하락). */
  profitPct: number;
  /** 주식 비중 (백분율). */
  stockPct: number;
  /** 코인 비중 (백분율). */
  cryptoPct: number;
};
