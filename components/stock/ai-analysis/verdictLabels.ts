import type { FinalVerdict } from "@/lib/types/stock/aiAnalysis";

/**
 * 판정 라벨·방향 판정 헬퍼 — AI 종합분석 결론(FinalVerdict)의 단일 출처.
 *
 * FinalVerdictCard 분해(ai-view-northstar-redesign) 이전엔 이 헬퍼들이 FinalVerdictCard 에 함께
 * 있었으나, 히어로(VerdictHero)/상세(VerdictDetails)/저장카드행(AIDecisionCard)이 공유하므로
 * 컴포넌트에서 분리한 경량 모듈로 승격한다(순수 상수·함수, JSX 없음).
 */

// 행동형 라벨 — 기관 비중 용어 대신 개인 투자자 행동 중심(강세→약세 6단계).
// 분석 결과 카드(components/analyze/AIDecisionCard)도 동일 라벨/방향 판정을 재사용한다.
export const VERDICT_LABEL: Record<FinalVerdict, string> = {
  BUY: "적극 매수", OVERWEIGHT: "분할 매수", HOLD: "중립",
  UNDERWEIGHT: "신규 진입 주의", REDUCE: "분할 매도", SELL: "매도 / 회피",
};

export const isBullishVerdict = (v: FinalVerdict) => v === "BUY" || v === "OVERWEIGHT";
export const isBearishVerdict = (v: FinalVerdict) => v === "SELL" || v === "REDUCE" || v === "UNDERWEIGHT";
