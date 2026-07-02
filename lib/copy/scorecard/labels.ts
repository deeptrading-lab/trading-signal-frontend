/**
 * 채점(scorecard) 운영자 뷰 한글 카피.
 *
 * PRD `signal-scorecard` §3-3-B / §3-4. 사용자/운영자 노출 문구는 본 모듈에 모은다(i18n 여지).
 */

export const SCORECARD_PAGE_TITLE = "판정 적중률";
export const SCORECARD_PAGE_SUBTITLE =
  "AI 판정이 실제로 맞았는지 결정시점 대비 수익률로 채점한 내부 자가점검 표예요.";

// ── 차원 필터 ─────────────────────────────────────────────────────────────────
export const FILTER_DIMENSION_LABEL = "집계 기준";
export const FILTER_HORIZON_LABEL = "평가 시점";

export const DIMENSION_LABEL = {
  verdict: "판정(verdict)별",
  confidence: "확신도별",
  horizon: "평가 시점별",
  signalScore: "신호 강도별",
} as const;

export const HORIZON_LABEL = {
  d1: "+1일",
  w1: "+1주",
  w2: "+2주",
  m1: "+1달",
  all: "전체",
} as const;

/** verdict 코드 → 한글(표 행 라벨). */
export const VERDICT_LABEL: Record<string, string> = {
  BUY: "적극 매수",
  OVERWEIGHT: "분할 매수",
  HOLD: "중립",
  UNDERWEIGHT: "신규 진입 주의",
  REDUCE: "분할 매도",
  SELL: "매도/회피",
};

/** confidence 코드 → 한글. */
export const CONFIDENCE_LABEL: Record<string, string> = {
  HIGH: "높음",
  MEDIUM: "보통",
  LOW: "낮음",
};

// ── 표 헤더 ───────────────────────────────────────────────────────────────────
export const COL_KEY = "구분";
export const COL_HORIZON = "평가 시점";
export const COL_HIT = "적중";
export const COL_MISS = "미적중";
export const COL_FLAT = "보합";
export const COL_TOTAL = "표본수";
export const COL_HIT_RATE = "적중률";

// ── 상태/안내 ─────────────────────────────────────────────────────────────────
export const STATE_LOADING = "적중률을 불러오는 중이에요.";
export const STATE_ERROR = "적중률 집계를 불러오지 못했어요.";
export const STATE_RETRY = "다시 시도";
export const STATE_REFRESH = "새로고침";

export const EMPTY_TITLE = "아직 채점된 판정이 없어요";
export const EMPTY_BODY =
  "결정 후 1영업일이 지나면 채점이 시작돼요. PRD 적용 이후 새로 생성된 판정부터 집계됩니다.";

export const NOT_CONFIGURED_TITLE = "채점 저장소가 설정되지 않았어요";
export const NOT_CONFIGURED_BODY =
  "Supabase 연결이 없어 채점 집계를 표시할 수 없어요. 환경 변수 설정 후 다시 확인해 주세요.";

/** 표본 N<5 안내(작은 표본 오해 방지). */
export const SMALL_SAMPLE_HINT = "표본 5건 미만 — 참고용";
export const SMALL_SAMPLE_THRESHOLD = 5;

/** 적중률 분모가 0(전부 보합)일 때 표기. */
export const HIT_RATE_NA = "—";

/** 헤더 요약(표본 규모). */
export function summaryHeadline(scoredCount: number, totalRows: number): string {
  return `채점 완료 ${scoredCount.toLocaleString("ko-KR")}건 · 원장 ${totalRows.toLocaleString("ko-KR")}건`;
}

/** 적중률 분모 안내(flat 제외). */
export const HIT_RATE_NOTE = "적중률 = 적중 / (적중 + 미적중) · 보합은 분모 제외";

// ── 신뢰도 캘리브레이션(scorecard-feedback (가)) ─────────────────────────────────
//
// 판정 카드(FinalVerdictCard)에서 모델 confidence 옆에 실측 적중률을 곁들인다(표시 전용).

/** confidence 코드 → 한글 짧은 라벨(카드 인라인용). */
export const CALIBRATION_CONFIDENCE_LABEL: Record<string, string> = {
  HIGH: "높음",
  MEDIUM: "보통",
  LOW: "낮음",
};

/**
 * 보정된 신뢰도 본문 — 예) "높음 · 실측 적중률 55% (n=25)".
 * confidence 라벨은 카드가 자체 라벨을 쓰므로 여기선 적중률·표본만 조립한다.
 */
export function calibrationHitRateText(hitRate: number | null, sample: number): string {
  const pct = hitRate === null ? "—" : `${Math.round(hitRate * 100)}%`;
  return `실측 적중률 ${pct} (n=${sample})`;
}

/** 표본 부족(n<MIN_SAMPLE_N) 시 칩 문구 — 모델 confidence 만 노출. */
export const CALIBRATION_INSUFFICIENT = "실측 표본 부족";

/** 보정 칩 hover 설명(표시 전용·모델 판정 불변임을 안내). */
export const CALIBRATION_BASIS =
  "과거 같은 확신도 판정이 실제로 적중한 비율(채점 누적). 모델 판정은 바꾸지 않는 표시용 보정이에요.";

/** 표본 부족 칩 hover 설명. */
export function calibrationInsufficientBasis(minSampleN: number): string {
  return `채점 표본이 ${minSampleN}건 미만이라 실측 적중률을 아직 신뢰하기 어려워요.`;
}

// ── 시장/베타 보정 채점(scorecard-relative-scoring) ─────────────────────────────
//
// 표 헤더·차원·국면(regime) 한글 카피. 주 적중률 = 초과수익(excess) 기준, abs 는 참고 병기.

/** 차원 필터에 추가되는 국면(regime) 라벨. */
export const REGIME_LABEL: Record<string, string> = {
  up: "강세장",
  down: "약세장",
  flat: "횡보장",
};

/** 차원 라벨에 regime 항목 추가(DIMENSION_LABEL 과 같은 키 공간). */
export const DIMENSION_LABEL_REGIME = "시장 국면별";

/** 주 적중률(초과수익) 컬럼 헤더 + abs 참고 컬럼 헤더. */
export const COL_HIT_RATE_EXCESS = "적중률(초과)";
export const COL_HIT_RATE_ABS = "적중률(절대)";

/** 주 지표 안내 — 표 상단. */
export const METRIC_NOTE_EXCESS =
  "적중률(초과) = 같은 기간 시장(KOSPI/KOSDAQ) 대비 초과수익으로 채점 · 적중률(절대)은 시장 베타 포함 참고치";

/** 주 지표 모드 → 한글 짧은 라벨. */
export const METRIC_MODE_LABEL: Record<string, string> = {
  absolute: "절대 수익률",
  excess: "초과수익(시장 대비)",
  beta_adjusted: "베타보정 알파",
};
