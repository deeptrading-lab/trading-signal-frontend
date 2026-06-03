/**
 * 7일 누적 외국인/기관 순매수 Top10 mock.
 *
 * PRD `investor-flow-cumulative` §4.B / §6.3 — 비-prod(로컬/preview) 환경에서 누적 모드의
 * 레이아웃·토글을 검증하기 위한 fallback. prod 는 KV 적립분을 합산한다(cron).
 *
 * 당일 mock(`top10.ts`)을 7일치로 스케일 업 — 거래대금을 ~7배로 키워 "누적"임을 시각화.
 * 사용자 노출 한글 카피 0건(식별자만). `cumulativeDays` 는 완전 7일로 표기.
 */

import { getMockInvestorFlowTop10 } from "@/lib/mock/flow/top10";
import type { InvestorFlowRow, InvestorFlowTop10 } from "@/lib/types/flow/top10";

function scaleRows(rows: InvestorFlowRow[], days: number): InvestorFlowRow[] {
  return rows.map((row) => ({
    ...row,
    netBuyAmount: row.netBuyAmount * days,
    netBuyQty: row.netBuyQty * days,
  }));
}

/** 누적 mock — 당일 mock 을 `days`배 스케일. asOf 생략(누적은 시각 무의미), cumulativeDays=days. */
export function getMockInvestorFlowCumulative(days: number): InvestorFlowTop10 {
  const today = getMockInvestorFlowTop10();
  return {
    foreign: scaleRows(today.foreign, days),
    institution: scaleRows(today.institution, days),
    cumulativeDays: days,
  };
}
