/**
 * 틱 자가채점 라벨 타입 — intraday-decision-overhaul PR-2.
 *
 * 영속된 모의 단타 틱을 사후 분봉 경로와 대조해 채점한 결과(Supabase `intraday_tick_labels`)와
 * 그 집계(캘리브레이션 패널 BFF 응답) 타입. 라벨 시맨틱은 `lib/signal/backtest/label.ts`
 * tripleBarrier 와 동일(봉 내 TP·SL 동시 터치 시 손절 우선 — 보수적).
 */

/**
 * 라벨 값.
 * - WIN — 익절가(TP) 먼저 도달 / LOSS — 손절가(SL) 먼저 터치.
 * - NEUTRAL — 당일 15:20(강제 청산 창)까지 양쪽 미도달 → 마지막 종가 기준 시간 만료.
 * - UNRESOLVED — 채점 불가(스냅샷·레벨 없음, 판단 이후 분봉 없음, KIS 과거 분봉 조회 불가 등).
 */
export type IntradayTickLabelValue = "WIN" | "LOSS" | "NEUTRAL" | "UNRESOLVED";

/** 판단 출처 — LLM 정상 경로(intraday-cli) vs 결정론 폴백(preGate 스킵·CLI 실패). */
export type IntradayTickLabelSource = "intraday-cli" | "intraday-fallback";

/**
 * 라벨 payload(jsonb) — 판단 시점 정량 요약. 스키마 진화 여지(conviction 은 PR-3a 에서 채워질
 * 값)라 컬럼 대신 jsonb 로 싣는다(무마이그레이션).
 */
export interface IntradayTickLabelPayload {
  /** 분봉 결정론 시그널 요약(intradaySnapshot.signal). */
  signalScore: number | null;
  signalAction: string | null;
  signalConfidence: number | null;
  regime: number | null;
  /** 채점에 실제 사용한 레벨(절대 원)과 그 출처(decision=LLM 결정가 / levels=구조 스냅샷). */
  entryPrice: number | null;
  tpPrice: number | null;
  slPrice: number | null;
  tpFrom: "decision" | "levels" | null;
  slFrom: "decision" | "levels" | null;
  /** 스냅샷 구조 레벨 메타. */
  rrr: number | null;
  tpSource: string | null;
  slSource: string | null;
  structureEvent: string | null;
  /** 채점에 쓴 분봉 단위(분). */
  timeframe: number;
  /** 방향확신 점수(PR-3a). 레거시·결정론 폴백 틱은 null. */
  conviction: number | null;
  /** UNRESOLVED 사유(진단) — 확정 라벨은 null. */
  reason: string | null;
}

/** Supabase `intraday_tick_labels` 1행 중 집계에 쓰는 필드(camel). */
export interface IntradayTickLabelRow {
  tickId: string;
  sessionId: string;
  ticker: string;
  action: string;
  source: IntradayTickLabelSource;
  label: IntradayTickLabelValue;
  returnPct: number | null;
  payload: IntradayTickLabelPayload | null;
}

/** 라벨 값별 카운트. */
export type IntradayLabelCounts = Record<IntradayTickLabelValue, number>;

/** 출처 × 판단 액션 버킷 — 캘리브레이션 표의 1행. */
export interface IntradayLabelBucket {
  source: IntradayTickLabelSource;
  action: string;
  counts: IntradayLabelCounts;
  total: number;
  /** 확정 라벨(WIN/LOSS/NEUTRAL) return_pct 평균 — 확정 0건이면 null. */
  avgReturnPct: number | null;
}

/** 시그널 점수대 밴드 키 — <40 / 40~60 / 60+. */
export type IntradayScoreBand = "lt40" | "b40to60" | "gte60";

/** 시그널 점수대 버킷 — 점수와 실측 결과의 정렬 확인(임계값 캘리브레이션 근거). */
export interface IntradayScoreBandBucket {
  band: IntradayScoreBand;
  counts: IntradayLabelCounts;
  total: number;
  avgReturnPct: number | null;
}

/** `GET /api/intraday/labels/summary` 응답. */
export interface IntradayTickLabelSummaryResponse {
  /** Supabase 미설정이면 false + 빈 집계(로컬 무DB 환경 fail-soft). */
  configured: boolean;
  total: number;
  buckets: IntradayLabelBucket[];
  scoreBands: IntradayScoreBandBucket[];
  generatedAt: string;
}

/** `POST /api/intraday/labels/run` 요청 — limit 미지정 시 서버 기본(3, 캡 10). */
export interface RunIntradayTickLabelsRequest {
  limit?: number;
}

/** `POST /api/intraday/labels/run` 응답. */
export interface RunIntradayTickLabelsResponse {
  configured: boolean;
  /** 이번 실행에서 WIN/LOSS/NEUTRAL 로 확정 저장한 틱 수. */
  labeled: number;
  /** 이번 실행에서 UNRESOLVED 로 저장한 틱 수(과거 분봉 조회 불가 등 — 정상 범위). */
  unresolved: number;
  /** 이번 실행에서 처리한 세션 수. */
  sessions: number;
  /** 아직 미라벨 틱이 남은 완료 세션 수 — 0 이 될 때까지 반복 실행(백필). */
  remaining: number;
  generatedAt: string;
}
