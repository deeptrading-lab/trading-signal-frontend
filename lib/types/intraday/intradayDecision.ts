/**
 * 장중 단타 결정 타입 (intraday-scalping-agent §3-4).
 *
 * `FinalDecision`(일봉 6단계 verdict·현재가 대비 %)을 재사용하지 않는다 — 단타는 절대 진입/목표/손절가가
 * 실행에 직접 필요하고, 3-액션이면 충분하며, 보유시간이 분 단위다.
 */

import type { DecisionSignal } from "@/lib/types/stock/aiAnalysis";

export type IntradayAction = "BUY" | "HOLD" | "SELL";
export type IntradayConfidence = "HIGH" | "MEDIUM" | "LOW";

/** 결정론 코어가 산출해 에이전트에 주입하는 정량 레벨(LLM 이 재계산하지 않음). */
export interface IntradayLevels {
  /** 마지막 분봉 종가. */
  lastClose: number;
  /** 박스권 상단/하단(최근 룩백 고저). */
  boxHigh: number | null;
  boxLow: number | null;
  /** 구조 기반 익절/손절 후보가(structureBarrier). */
  tpPrice: number | null;
  slPrice: number | null;
  /** TP/SL 소스(hvn=매물대 / swing=박스 / ma). */
  tpSource: string | null;
  slSource: string | null;
  /** 손익비 (tp-진입)/(진입-sl). */
  rrr: number | null;
  /** 구조 TP 까지 거리(% — 2~5% 단타 목표 충족 판정용). */
  tpPct: number | null;
  /** 구조 SL 까지 거리(%, 음수). */
  slPct: number | null;
}

export interface IntradayPositionView {
  avgEntryPrice: number;
  quantity: number;
  unrealizedPnlPct: number;
  /** 진입 후 경과 분. */
  heldMinutes: number;
}

/** 직전 틱 결정 요약 — "열린 거래 관리" 연속성 인식용. */
export interface IntradayDecisionEcho {
  action: IntradayAction;
  targetPrice: number | null;
  stopPrice: number | null;
  invalidationPrice: number | null;
  rationale: string;
}

/** 에이전트 그룹이 보는 1틱 컨텍스트. */
export interface IntradayContext {
  ticker: string;
  name: string;
  /** 분봉 기준 타임스탬프(YYYY-MM-DDTHH:mm). */
  asOf: string;
  /** 현재가(원). */
  price: number;
  /** 분봉 단위(분). */
  timeframe: number;
  /** 분봉 결정론 시그널 압축본(4축/score/action/regime). */
  signal: DecisionSignal;
  levels: IntradayLevels;
  /** 최근 N틱 가격 흐름. */
  recentBars: { t: string; close: number; changePct: number }[];
  position: IntradayPositionView | null;
  previousDecision: IntradayDecisionEcho | null;
  /** 장중 시각 "HH:mm"(KST) — 15:00 이후 신규진입 금지 게이트. */
  nowHhmm: string;
}

/** LLM(②진입·청산 판단가)이 생성하는 부분 — 서버가 메타로 보강. */
export interface IntradayDecisionLlm {
  action: IntradayAction;
  confidence: IntradayConfidence;
  /** 신규 진입가 구간(절대 원). HOLD/SELL=null. */
  entryZone: { low: number; high: number } | null;
  /** 익절 목표가(절대 원, +2~5% 안쪽). */
  targetPrice: number | null;
  /** 손절가(절대 원). */
  stopPrice: number | null;
  /** 논거 무효가(이 가격 이탈 시 추적). */
  invalidationPrice: number | null;
  expectedHoldingMinutes: number | null;
  /** 한국어 개조식 1~2문장. */
  rationale: string;
  riskNotes: string[];
}

/** 최종 단타 결정 — LLM 부분 + 서버 메타. */
export interface IntradayDecision extends IntradayDecisionLlm {
  /** 판단 시 기준가(마지막 분봉 종가). */
  basePrice: number;
  /** 손익비. */
  rrr: number | null;
  /** 분봉 결정론 시그널 스냅샷. */
  signal: DecisionSignal;
  /** 결정 출처 — cli=에이전트 그룹 정상 / fallback=결정론 폴백(CLI 실패·게이트). */
  source: "intraday-cli" | "intraday-fallback";
  /** ① 흐름·세력 분석가 진단 원문(디버그/표시). */
  analystNote?: string;
  /** 사후 룰 게이트가 LLM 결정을 조정한 내역. */
  gateAdjustments: string[];
}
