/**
 * 채점(scorecard) 상수 — 코드 한 곳에서 조정.
 *
 * PRD `signal-scorecard` §9 D7 / §6 — horizon 영업일·적중 임계 T·flat 처리 방식을 본 모듈에
 * 모아 둔다. env 노출은 phase-1 불요(상수 변경 = 코드 1줄). 적중 판정 로직(`scoring.ts`)과
 * 채점 cron(`/api/cron/score-decisions`)이 이 값을 단일 진실 원천으로 참조한다.
 */

import type { ScorecardHorizon } from "@/lib/types/scorecard/scorecard";

/**
 * horizon 별 평가 경과 영업일 임계.
 * - d1 = 결정 후 1영업일
 * - w1 = 5영업일(약 1주)
 * - m1 = 21영업일(한국시장 약 1달)
 *
 * `businessDaysBetween(entry, today) >= 임계` 이면 평가 대상(도래).
 */
export const HORIZON_BUSINESS_DAYS: Record<ScorecardHorizon, number> = {
  d1: 1,
  w1: 5,
  m1: 21,
};

/** 평가 순서(고정) — cron·집계·표 컬럼 순서 단일 원천. */
export const HORIZONS: ScorecardHorizon[] = ["d1", "w1", "m1"];

/**
 * 적중 임계 T(%). 결정시점 대비 horizon 수익률 `r%` 의 절대 폭 밴드.
 * 예) T=2 → BUY 는 r ≥ +2% 면 hit, r ≤ −2% 면 miss, 그 사이는 flat.
 *
 * phase-1 고정 상수. 추후 target_pct/stop_loss_pct·ATR 기반 동적 배리어로 확장(phase-2).
 */
export const HIT_THRESHOLD_PCT = 2;

/**
 * 1회 cron 실행에서 처리할 채점 원장 행 수 상한(배치).
 * KIS 일봉 조회를 ticker 마다 1회 하므로 rate-limit·실행시간 보호. 미처리 행은 다음 실행에서 재시도.
 */
export const SCORE_BATCH_LIMIT = 60;

/** ticker 간 KIS 일봉 조회 지연(ms) — EGW00201(초당 한도) 회피. flow-snapshot 패턴 정합. */
export const SCORE_TICKER_DELAY_MS = 200;

/** transient(EGW00201/네트워크) 1회 재시도 backoff(ms). */
export const SCORE_RETRY_BACKOFF_MS = 250;

/**
 * horizon 평가 시점 종가를 찾을 때, 임계 영업일 시점부터 미래로 탐색할 최대 봉 수.
 * 평가일이 휴장이면 그 직후 가장 가까운 영업봉 종가를 쓴다(연속 휴장 흡수). 이를 넘으면 skipped.
 */
export const HORIZON_CLOSE_LOOKAHEAD_BARS = 7;
