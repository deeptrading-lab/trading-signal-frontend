/**
 * 채점 원장(signal_scorecard) 도메인 타입.
 *
 * PRD `signal-scorecard` §3-1 — 결정 1건 = 채점 원장 1행(append). 분석에서 PM final 판정이
 * 나오고 결정시점 가격 캡처에 성공하면 insert 된다. horizon(d1/w1/m1)별로 pending → hit/miss/
 * flat/skipped 로 cron 이 갱신한다.
 *
 * - `FinalVerdict`·`FinalDecision.confidence`·`DecisionSignal` 은 `aiAnalysis.ts` 에서 재사용.
 * - 채점 원장은 비-ticker-PK append 테이블이라 동일 ticker 재분석 시 새 행이 쌓인다(history).
 */

import type { FinalVerdict, AIAnalysisProvider } from "@/lib/types/stock/aiAnalysis";
import type { SignalAction } from "@/lib/types/signal";

/** 평가 시점(horizon) — +1d / +1w / +1m. 경과 영업일 임계는 `constants.HORIZON_BUSINESS_DAYS`. */
export type ScorecardHorizon = "d1" | "w1" | "m1";

/**
 * horizon 평가 상태.
 * - pending — 아직 평가 시점이 도래하지 않았거나 채점 전.
 * - hit — 신호 방향이 맞음(§3-2-A 규칙).
 * - miss — 신호 방향이 틀림.
 * - flat — 방향 판단 밴드(±T) 안에 머묾(적중률 분모 제외 — D3).
 * - skipped — 봉 부재(상폐·연속 휴장)로 평가 불가.
 */
export type HorizonStatus = "pending" | "hit" | "miss" | "flat" | "skipped";

/** confidence(HIGH/MEDIUM/LOW) — FinalDecision.confidence 재사용. */
export type ScorecardConfidence = "HIGH" | "MEDIUM" | "LOW";

/** 채점 원장 1행 — Supabase row 를 camelCase 로 평탄화한 형태. */
export interface ScorecardRow {
  id: string;
  ticker: string;
  provider: AIAnalysisProvider;
  verdict: FinalVerdict;
  decisionConfidence: ScorecardConfidence;
  /** DecisionSignal.score(0~100). 결정론 신호 강도 — 보조 집계 차원. */
  signalScore: number | null;
  /** DecisionSignal.action(BUY/HOLD/SELL). */
  signalAction: SignalAction | null;
  /** FinalDecision.target_pct(현재가 대비 목표 %, nullable). */
  targetPct: number | null;
  /** FinalDecision.stop_loss_pct(항상 음수 %). */
  stopLossPct: number | null;
  /** 결정시점 기준 봉 종가(KRW) = entry. */
  entryClose: number;
  /** 결정시점 기준 봉 날짜(YYYY-MM-DD) = signal.asOf. */
  entryDate: string;
  /** 라이브 현재가(보조 — 채점 미사용, D2). */
  livePrice: number | null;
  /** 판정 생성 timestamp(ISO). */
  decidedAt: string;
  /** 토큰 usage 연계 키(nullable). */
  runId: string | null;

  d1Status: HorizonStatus;
  d1Close: number | null;
  d1ReturnPct: number | null;
  d1ScoredAt: string | null;

  w1Status: HorizonStatus;
  w1Close: number | null;
  w1ReturnPct: number | null;
  w1ScoredAt: string | null;

  m1Status: HorizonStatus;
  m1Close: number | null;
  m1ReturnPct: number | null;
  m1ScoredAt: string | null;

  createdAt: string;
}

/** 채점 원장 insert 입력 — 분석 route.ts 의 PM final 직후 캡처값. */
export interface ScorecardInsert {
  ticker: string;
  provider: AIAnalysisProvider;
  verdict: FinalVerdict;
  decisionConfidence: ScorecardConfidence;
  signalScore: number | null;
  signalAction: SignalAction | null;
  targetPct: number | null;
  stopLossPct: number | null;
  entryClose: number;
  entryDate: string;
  livePrice: number | null;
  decidedAt: string;
  runId: string | null;
}

/** 한 horizon 평가 결과 — cron 이 채점 후 store 에 갱신할 패치. */
export interface HorizonScoreUpdate {
  status: HorizonStatus;
  close: number | null;
  returnPct: number | null;
  scoredAt: string;
}

export type ScorecardWriteResult =
  | { ok: true; skipped: false }
  | { ok: true; skipped: true; reason: "not_configured" }
  | { ok: false; skipped: false; error: string };

// ─── 집계(summary) API ──────────────────────────────────────────────────────

/** 집계 차원. */
export type ScorecardDimension = "verdict" | "confidence" | "horizon" | "signalScore";

/** 집계 셀 1개 — 차원 키 × horizon 별 hit/miss/flat 카운트 + 적중률. */
export interface ScorecardSummaryCell {
  dimension: ScorecardDimension;
  /** 차원 키(verdict 값 / HIGH·MEDIUM·LOW / d1·w1·m1 / 점수구간 라벨). */
  key: string;
  /** horizon 차원이면 key 와 동일, 그 외엔 집계 대상 horizon("all" = 전 horizon 합산). */
  horizon: ScorecardHorizon | "all";
  hit: number;
  miss: number;
  flat: number;
  /** hit + miss + flat (채점 완료 표본 수). skipped/pending 제외. */
  total: number;
  /** hit / (hit + miss). 분모(hit+miss) 0 이면 null(D3 — flat 분모 제외). */
  hitRate: number | null;
}

export interface ScorecardSummaryResponse {
  /** Supabase 연결 여부 — false 면 빈 집계 + 미설정 안내. */
  configured: boolean;
  cells: ScorecardSummaryCell[];
  /** 채점 완료 행 수(전체) — 표본 규모 표시. */
  scoredCount: number;
  /** 채점 원장 전체 행 수(pending 포함). */
  totalRows: number;
  generatedAt: string;
}

// ─── 신뢰도 캘리브레이션(scorecard-feedback (가)) ────────────────────────────

/**
 * 한 confidence 버킷(HIGH/MEDIUM/LOW)의 실측 보정 — 표시 전용(모델 판정 불변).
 *
 * PRD `scorecard-feedback` §(가). confidence 차원 집계 셀을 전 horizon 합산해
 * 실측 적중률 + 표본수(n=hit+miss)를 산출한다. n<MIN_SAMPLE_N 이면 `sufficient:false`.
 */
export interface ConfidenceCalibration {
  confidence: ScorecardConfidence;
  /** 실측 적중률 hit/(hit+miss). 표본 0 이면 null. */
  hitRate: number | null;
  /** 표본수 = hit + miss(flat 제외, MIN_SAMPLE_N 게이트 기준). */
  sample: number;
  hit: number;
  miss: number;
  /** sample >= MIN_SAMPLE_N 이면 true(실측 적중률 노출 가능). false 면 "표본 부족". */
  sufficient: boolean;
}

/** `/api/scorecard/calibration` 응답 — confidence 버킷별 보정값(표시용, 읽기 전용). */
export interface ScorecardCalibrationResponse {
  /** Supabase 연결 여부 — false 면 calibrations 빈 배열. */
  configured: boolean;
  /** HIGH/MEDIUM/LOW 중 표본이 1건 이상인 버킷만 포함(없으면 빈 배열). */
  calibrations: ConfidenceCalibration[];
  /** 게이트 기준값(MIN_SAMPLE_N) — 클라가 안내 문구에 노출. */
  minSampleN: number;
  generatedAt: string;
}
