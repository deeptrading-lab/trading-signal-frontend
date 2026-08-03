/**
 * 장중 단타 결정 타입 (intraday-scalping-agent §3-4).
 *
 * `FinalDecision`(일봉 6단계 verdict·현재가 대비 %)을 재사용하지 않는다 — 단타는 절대 진입/목표/손절가가
 * 실행에 직접 필요하고, 3-액션이면 충분하며, 보유시간이 분 단위다.
 */

import type { AgentUsage, DecisionSignal } from "@/lib/types/stock/aiAnalysis";
import type { StockWarningItem } from "@/lib/types/stock/warnings";

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
  /** TP/SL 소스(hvn=매물대 / swing=박스 / ma / atr=구조 미확보 시 변동성 폴백). */
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
  /** 포트폴리오 대비 현재 비중(%) — AI 분할 청산 비율의 기준. */
  allocationPct: number;
}

/** 직전 틱 결정 요약 — "열린 거래 관리" 연속성 인식용. */
export interface IntradayDecisionEcho {
  action: IntradayAction;
  /**
   * 직전 확신 점수(0~100) — 미영속 시 "58점 거의 매수"가 맨 HOLD 로 에코돼 무상태 노이즈가
   * 되는 것을 막는다(PRD intraday-decision-overhaul §8). 구 틱·폴백 틱은 null.
   */
  convictionScore?: number | null;
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
  /**
   * 판단 주기(분) — 다음 점검까지 개입할 수 없는 시간. LLM 이 진입/청산 시야(horizon)를
   * 주기에 맞추도록 컨텍스트에 노출한다(5분 이상 = 다음 주기까지 견딜 셋업만).
   */
  intervalMinutes: number;
  /** 분봉 결정론 시그널 압축본(4축/score/action/regime). */
  signal: DecisionSignal;
  levels: IntradayLevels;
  /** 최근 N틱 가격 흐름. */
  recentBars: { t: string; close: number; changePct: number }[];
  position: IntradayPositionView | null;
  previousDecision: IntradayDecisionEcho | null;
  /** 장중 시각 "HH:mm"(KST) — 15:00 이후 신규진입 금지 게이트. */
  nowHhmm: string;
  /**
   * 캔들 미시구조 피처 블록(결정론 산출, 한국어 포맷) — 마감봉 꼬리·스윙 구조(저점 붕괴/전고
   * 돌파)·피보나치 되돌림·단기 박스. `lib/signal/intradayFeatures` 가 만들고 프롬프트에 그대로
   * 끼운다. 봉 부족 시 빈 문자열(무주입).
   */
  featuresText?: string;
  /**
   * 일봉 흐름 요약(I1) — MACD 크로스·RSI·이평 배열·전고/전저 대비 위치. 분봉 진입을 상위
   * 타임프레임에 정렬하도록 프롬프트에 주입한다(`lib/signal/dailyContext`). 봉 부족·미설정 시
   * 빈 문자열(무주입 → 기존 레짐 한 줄만).
   */
  dailyContextText?: string;
  /**
   * 수급 선행(order flow) 요약(I3) — 체결강도·호가 잔량 불균형. LLM 호출 경로에서만 fail-soft 로
   * 조회(`orderFlowContext`). 가격 후행이 못 잡는 실시간 수급을 진입 확인/거부권으로 쓴다. 미설정·
   * 빈값이면 빈 문자열(무주입).
   */
  orderFlowText?: string;
  /** 매수 관심 구조 이벤트(예: "전고 돌파 진행") — 사전 게이트의 LLM 스킵을 뚫는 트리거. */
  structureEvent?: string | null;
  /**
   * 활성 매수 유의사항(거래소 시장경보·VI) — 토스 warnings(PRD intraday-warnings §3-2).
   * LLM 호출 시에만 fail-soft 로 채운다(스킵 틱은 미조회). 없거나 키 미설정이면 빈 배열/미주입.
   */
  warnings?: StockWarningItem[];
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
  /**
   * BUY 시 포트폴리오 대비 목표 비중(%, 5~100) — AI 가 확신·손익비·변동성에 따라 분할 진입
   * 크기를 정한다. null 이면 리스크모드 기본값. 서버가 maxPositionPct 로 상한 캡.
   */
  entryPositionPct: number | null;
  /**
   * SELL 시 보유 수량 중 청산 비율(%, 10~100) — 100 미만이면 분할 청산(REDUCE).
   * null 이면 전량(100). HOLD/BUY 에선 무시.
   */
  sellRatioPct: number | null;
  /** 한국어 개조식 1~2문장. */
  rationale: string;
  riskNotes: string[];
  /**
   * judge 방향 확신 점수(0~100, 50=중립·초과=상승 확신) — v2 스키마의 원본 출력이며
   * action/confidence/사이징은 이 점수에서 서버가 결정론으로 파생한다(PR-3a).
   * v1 레거시 파싱은 근사 합성(BUY→70/SELL→30/HOLD→50 — 점수 의미가 약한 추정치).
   * 결정론 폴백(LLM 미관여)은 null/미기록.
   */
  convictionScore?: number | null;
  /**
   * judge 응답 스키마 판별 — "v2"=convictionScore 점수화 / "v1"=action 직접 출력(전환기 호환).
   * 캘리브레이션 집계에서 근사 합성(v1)을 구분하기 위한 마커.
   */
  judgeSchema?: "v1" | "v2";
}

/**
 * 종목 상세 "장중 단타 판단(참고)" 카드 응답 — on-demand standalone read.
 * ⚠️ 의사결정 보조용. 자동 수익/집행을 주장하지 않으며 최종 판단·집행은 사람이 한다.
 */
export interface IntradayReadResponse {
  ticker: string;
  name: string;
  /** 분봉 기준 시각(YYYY-MM-DDTHH:mm). */
  asOf: string;
  price: number;
  timeframe: number;
  signal: DecisionSignal;
  levels: IntradayLevels;
  decision: IntradayDecision;
  /** 워밍업 부족 등 신뢰도 경고(있으면). */
  warning?: string;
}

/**
 * 판단 시점 정량 스냅샷 — 사후 미스 분석·모델 A/B 의 **숫자** 근거. 저장 틱(PaperTradingDecision)에
 * 실려 Supabase payload(jsonb)로 함께 영속된다(무마이그레이션). LLM·결정론 폴백 **모든 틱**에 기록.
 *
 * ⚠️ 배경: 기존 저장 틱엔 근거 텍스트(rationale)만 남고 시그널·손익비·박스 레벨 같은 숫자가 빠져,
 *    "저항까지 몇 %·손익비 얼마·레짐 뭐였나"를 사후에 숫자로 볼 수 없었다(키워드 grep 으로만 분석 가능).
 *    이 스냅샷으로 진입 게이트 캘리브레이션(A/B)·미스 원인 정량 집계가 가능해진다.
 */
export interface IntradaySnapshot {
  /** 판단 기준가(마지막 분봉 종가). */
  basePrice: number;
  /** 분봉 결정론 시그널(4축 score·action·regime·confidence) — 왜 이 판단인지의 정량 근거. */
  signal: DecisionSignal;
  /** 구조 레벨(박스 상·하단·구조 TP/SL·손익비·목표 거리%). "저항까지 여유" 계산의 원천. */
  levels: IntradayLevels;
  /** 매수 관심 구조 이벤트(예: "전고 돌파 진행") 발생 여부 — 없으면 null. 돌파 참여 분석용. */
  structureEvent: string | null;
}

/**
 * 에이전트 CLI 실패 종류 (PRD intraday-decision-overhaul PR-0).
 * empty=정상 종료했지만 빈 응답 / parse=텍스트는 왔으나 JSON 파싱 실패(원문 보존) /
 * timeout·abort·error=호출 예외(에러 name 으로 분류).
 */
export type IntradayAgentFailureKind = "empty" | "parse" | "timeout" | "abort" | "error";

/**
 * 에이전트 1개(분석가/판단가)의 호출 진단 — 실패(또는 재시도 후 회복) 시에만 기록.
 * 성공-무재시도 틱은 미기록(payload 경량 유지). 재시도가 있었으면 **마지막 실패 기준**이되,
 * 앞선 실패의 rawTextHead·usage 는 뒤 실패에 없으면 이월 보존한다(파싱 실패 원문이 가장 귀한 진단).
 */
export interface IntradayAgentDiagnostics {
  failureKind: IntradayAgentFailureKind;
  /** 총 시도 횟수(재시도 포함). */
  attempts: number;
  /** 실패 응답 원문 앞부분(최대 2KB) — parse 실패 진단용. empty/예외는 미기록. */
  rawTextHead?: string;
  /** 예외 메시지("name: message", 최대 300자). */
  errorMessage?: string;
  /** 실패 시도의 토큰 사용량 — 성공 시도의 usage 는 기존 judgeUsage/analystUsage 로 간다(의미 유지). */
  usage?: AgentUsage;
  /** 재시도 끝에 최종 성공했는가 — true 면 결정은 LLM 산(진단은 실패 시도 기록). */
  recovered?: boolean;
}

/** 틱 판단의 에이전트 진단 묶음 — `PaperTradingDecision.agentDiagnostics` 로 영속(payload jsonb). */
export interface IntradayTickAgentDiagnostics {
  analyst?: IntradayAgentDiagnostics;
  judge?: IntradayAgentDiagnostics;
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
