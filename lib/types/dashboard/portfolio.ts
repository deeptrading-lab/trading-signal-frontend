/**
 * `/dashboard` 의 포트폴리오 hero 카드 데이터.
 *
 * 본 PRD 단계 = mock. 후속 BE PRD (가칭 `dashboard-backend`) 에서 BE 응답 envelope 에 맞춰
 * 갱신될 가능성이 있어 핵심 외 필드는 옵셔널로 두지 않고 mock 단계에서 1차 정합으로 시작한다.
 *
 * 금액은 원(KRW) 정수, 비율은 백분율 숫자(예: 4.2 = +4.2%).
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
