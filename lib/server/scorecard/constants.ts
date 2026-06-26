/**
 * 채점(scorecard) 상수 — 코드 한 곳에서 조정.
 *
 * PRD `signal-scorecard` §9 D7 / §6 — horizon 영업일·적중 임계 T·flat 처리 방식을 본 모듈에
 * 모아 둔다. env 노출은 phase-1 불요(상수 변경 = 코드 1줄). 적중 판정 로직(`scoring.ts`)과
 * 채점 cron(`/api/cron/score-decisions`)이 이 값을 단일 진실 원천으로 참조한다.
 */

import type {
  ScorecardHorizon,
  ScoringMetricMode,
} from "@/lib/types/scorecard/scorecard";

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

// ─── 자가교정 피드백(scorecard-feedback) 상수 ────────────────────────────────
//
// PRD `scorecard-feedback` §공통 — 캘리브레이션 표시·PM 프롬프트 성적 주입의 게이트를
// 본 모듈 한 곳에서 조정한다. phase-1 채점(scoring.ts)·집계(summarize.ts)는 무변경.

/**
 * 캘리브레이션·프롬프트 주입에 쓰는 최소 표본수(hit+miss).
 * - 표시(가): 한 confidence 버킷의 표본수가 이 값 미만이면 "표본 부족"으로 폴백(실측 적중률 미노출).
 * - 주입(나): 이 값 미만 버킷은 성적 요약 문자열에서 제외(없으면 빈 문자열).
 *
 * 작은 표본의 적중률은 통계적으로 신뢰할 수 없어 과신·앵커링을 유발하므로 게이트한다.
 * 코드 1줄로 조정(env 노출 불요 — 운영자 1인 MVP).
 */
export const MIN_SAMPLE_N = 20;

/**
 * PM 분석 프롬프트에 과거 판정 성적(적중률)을 주입할지 여부 — **기본 OFF**.
 *
 * PRD `scorecard-feedback` §(나). 운영자가 채점 표본을 충분히 신뢰한 뒤에만 켠다.
 * - OFF(기본): PM 프롬프트 무변경 → 완전 무회귀.
 * - ON: n≥MIN_SAMPLE_N 버킷이 있으면 성적 요약 블록을 PM system 프롬프트에 덧붙인다.
 *
 * env `SCORECARD_FEEDBACK_PROMPT` = "1"·"true"·"on"(대소문자 무시) 이면 ON, 그 외/미설정은 OFF.
 * 서버 전용(NEXT_PUBLIC_ 금지) — 프롬프트는 route handler 안에서만 조립된다.
 */
export function isScorecardFeedbackPromptEnabled(): boolean {
  const raw = process.env.SCORECARD_FEEDBACK_PROMPT?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on";
}

/**
 * horizon 평가 시점 종가를 찾을 때, 임계 영업일 시점부터 미래로 탐색할 최대 봉 수.
 * 평가일이 휴장이면 그 직후 가장 가까운 영업봉 종가를 쓴다(연속 휴장 흡수). 이를 넘으면 skipped.
 */
export const HORIZON_CLOSE_LOOKAHEAD_BARS = 7;

// ─── 시장/베타 보정 채점(scorecard-relative-scoring) 상수 ────────────────────
//
// PRD `scorecard-relative-scoring`. 절대 수익률 채점은 시장 베타에 올라타 약세 판정이 자동
// hit 되는 문제가 있어, 같은 horizon 의 벤치마크 지수 수익률을 빼 알파(종목 선택력)를 측정한다.
// 본 상수는 한 곳에서 조정(env 노출 불요 — 운영자 1인 MVP).

/**
 * 주 채점 지표 모드.
 * - "absolute"      — phase-1 동치(결정시점 대비 절대 수익률 r%).
 * - "excess"(기본)  — 초과수익 = abs − bench(같은 horizon 벤치마크 지수 수익률).
 * - "beta_adjusted" — 베타보정 잔차 = abs − β·bench(β 추정 불가 시 excess 로 폴백).
 *
 * 기본 = "excess". OVERWEIGHT/UNDERWEIGHT 가 본질적으로 "시장 대비" 상대 개념이라, 시장 베타를
 * 1로 가정해 통째로 빼는 초과수익이 알파의 1차 근사로 견고하다(β 추정 표본 의존도가 낮음).
 */
export type { ScoringMetricMode } from "@/lib/types/scorecard/scorecard";
export const SCORING_METRIC_MODE: ScoringMetricMode = "excess";

/**
 * 시장 국면(regime) 분류 임계(%). 해당 horizon 구간 벤치마크 수익률 기준.
 * - bench ≥ +T_regime → 강세장(up) / bench ≤ −T_regime → 약세장(down) / 그 사이 → 횡보(flat).
 *
 * 적중 임계 T(HIT_THRESHOLD_PCT=2) 보다 약간 작게 잡아(1.5%) 명확한 추세장과 횡보를 가른다.
 */
export const REGIME_THRESHOLD_PCT = 1.5;

/**
 * 베타(β) 추정 윈도우 — entry **직전** 영업일 수(종목·지수 일간수익률 회귀 표본 구간).
 * 60영업일 ≒ 약 3달. 직전 구간이라 entry 시점 정보만 사용(look-ahead 없음 — 결정론).
 */
export const BETA_WINDOW_BUSINESS_DAYS = 60;

/**
 * β 추정 최소 유효 페어 수. 이 미만이면 β=null(beta_adjusted 가 excess 로 폴백).
 * 신규 상장·장기 거래정지로 윈도우 봉이 부족한 종목을 방어한다.
 */
export const BETA_MIN_PAIRS = 30;

/**
 * 벤치마크 지수 코드(KIS 업종 코드). 종목 상장시장 → 벤치마크 매핑.
 * - KOSPI 종목 → "0001"(KOSPI 종합지수)
 * - KOSDAQ 종목 → "1001"(KOSDAQ 종합지수)
 */
export const BENCH_INDEX_CODE = {
  KOSPI: "0001",
  KOSDAQ: "1001",
} as const;

/**
 * 종목 상장시장을 `symbols.json` 에서 못 찾을 때의 폴백 벤치마크.
 * KOSPI 가 시총 비중이 커 시장 베타 근사로 더 보수적(과대 hit 위험 낮음). 한계는 PRD §6 명시.
 */
export const BENCH_FALLBACK_CODE = BENCH_INDEX_CODE.KOSPI;
