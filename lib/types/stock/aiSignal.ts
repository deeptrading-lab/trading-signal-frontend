/**
 * AI 최종 판단 타입 — 시그널 데이터 + Claude CLI 웹 리서치 결과.
 *
 * 기술적 규칙 엔진(evaluateSignal)이 "숫자"를 제공하고,
 * Claude CLI가 웹 리서치로 최신 뉴스·공시·실적을 더해 "판단 + 근거"를 생성한다.
 * (§4-3 환각 제거 — LLM은 설명만, 숫자 추정 X)
 */

export type AISignalRequest = {
  ticker: string;
};

/** 최종 판단 enum — 기술적 signal action 보다 넓은 4값. */
export type AISignalVerdict = "BUY" | "HOLD" | "SELL" | "WATCH";

export type AISignalResponse = {
  /** 최종 판단. */
  verdict: AISignalVerdict;
  /** 종합 근거 — 기술적 시그널 + 최신 뉴스 맥락 2~3문장. */
  reasoning: string;
  /** 최근 뉴스·이벤트·공시 핵심 2~3개. */
  key_catalysts: string[];
  /** 주요 리스크 2~3개. */
  risk_factors: string[];
  /** AI 확신도 한 문장 — 데이터 한계·불확실성 명시. */
  confidence_note: string;
  /** 면책 문구. */
  disclaimer: string;
};
