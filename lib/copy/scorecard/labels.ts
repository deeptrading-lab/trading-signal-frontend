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

// ── 방향 적중 게이트(참고 지표 — 오픈베타 조건 아님, ai-direction-quality §10) ─────────

export const GATE_TITLE = "방향 적중 (참고 지표)";
export const GATE_REFERENCE_NOTE =
  "오픈베타 조건이 아니에요 — 2026-10-18 조건을 판정 정직성으로 재정의하면서 참고용으로만 남겼어요.";
export function gateCriteria(marginPp: number, minN: number): string {
  return `2주 뒤 방향 적중률이 찍기 점수보다 ${marginPp}%p 이상 높고, 방향별 ${minN}건 이상일 때 통과`;
}
export const GATE_BASE_NOTE =
  "찍기 점수 = 같은 기간 채점된 전체 판정(중립 포함) 중 실제로 그 방향으로 움직인 비율 · 오른다 = 적극 매수·분할 매수, 내린다 = 매도/회피·분할 매도·신규 진입 주의";
export const GATE_SIDE_LABEL = { bull: "오른다", bear: "내린다" } as const;
/** 방향 라벨 hover — 어떤 판정이 묶이는지. */
export const GATE_SIDE_HINT = {
  bull: "적극 매수·분할 매수 판정",
  bear: "매도/회피·분할 매도·신규 진입 주의 판정",
} as const;
export const GATE_COL_SIDE = "방향";
export const GATE_COL_N = "건수";
export const GATE_COL_HIT_RATE = "적중률";
export const GATE_COL_BASE = "찍기 점수";
export const GATE_COL_DIFF = "차이";
export const GATE_COL_RESULT = "판정";
export const GATE_RESULT = { pass: "통과", fail: "미달", pending: "표본 부족" } as const;
export const GATE_HEADLINE = { pass: "기준 통과", fail: "기준 미달", pending: "판정 보류 (표본 부족)" } as const;
export function gateHeadline(state: keyof typeof GATE_HEADLINE, sample: number): string {
  return `${GATE_HEADLINE[state]} · 채점 ${sample}건`;
}

// ── 오픈베타 조건 — 판정 정직성(ai-direction-quality §10-1) ─────────────────────

export const OPEN_BETA_TITLE = "오픈베타 조건 (판정 정직성)";
export const OPEN_BETA_COL_CONDITION = "조건";
export const OPEN_BETA_COL_VALUE = "현재";
export const OPEN_BETA_COL_RESULT = "판정";
export const OPEN_BETA_RESULT = {
  pass: "통과",
  fail: "미달",
  pending: "판정 보류",
  unknown: "확인 불가",
  manual: "수동 점검",
} as const;

/** 수동 항목 최근 점검 기록 — 점검할 때마다 갱신. */
export const OPEN_BETA_COPY_AUDIT = { pr: "#394", date: "2026-10-18" } as const;

export function openBetaHeadline(failCount: number, pendingCount: number): string {
  if (failCount > 0) return `미달 ${failCount}항목 · 수동 2항목 확인 필요`;
  if (pendingCount > 0) return `판정 보류 ${pendingCount}항목 · 수동 2항목 확인 필요`;
  return "자동 항목 통과 · 수동 2항목 확인 필요";
}

const pctOf = (rate: number) => `${Math.round(rate * 100)}%`;

export const OPEN_BETA_ITEMS = {
  stopLine: {
    label: "무효화 라인 보유율",
    criteria: (minRate: number, windowDays: number) =>
      `최근 ${windowDays}일 진입한 오른다·내린다 판정 중 무효화 라인이 있는 비율 ≥ ${pctOf(minRate)}`,
    empty: "최근 표본 없음",
  },
  levels: {
    label: "인용 가격 레벨 창작 0",
    criteria: "판정이 인용한 가격 레벨이 실측과 일치",
    manual: "수동 점검 — 최근 분석 10건 표본 감사",
  },
  continuity: {
    label: "채점 연속성",
    criteria: (maxBusinessDays: number) =>
      `마지막 채점 실행이 성공했고 ${maxBusinessDays}영업일 이내 · 대리 지표(서버 헬스 마커 — 원 기준 "최근 4주 워크플로 실패 0" 은 GitHub Actions 기록으로 확인)`,
  },
  badge: {
    label: "채점 배지 부착률",
    criteria: (minRate: number, matureDays: number) =>
      `분석 후 ${matureDays}일이 지난 국내 종목 카드 중 채점 결과가 붙은 비율 ≥ ${pctOf(minRate)}`,
    empty: "대상 카드 없음",
  },
  claims: {
    label: "적중률·수익 주장 0",
    criteria: "사용자에게 보이는 문구에 적중률·수익 보장 표현 없음",
    manual: `수동 점검 — 최근 점검 PR ${OPEN_BETA_COPY_AUDIT.pr}(${OPEN_BETA_COPY_AUDIT.date})`,
  },
} as const;

/** 실측 비율 — 소수 첫째 자리 **내림**(94.9% 가 "95%"로 올라가 기준을 넘은 것처럼 보이지 않게). */
const measuredPct = (rate: number) => {
  const v = Math.floor(rate * 1000) / 10;
  return `${Number.isInteger(v) ? v : v.toFixed(1)}%`;
};

export function openBetaRatioValue(n: number, count: number, rate: number | null, empty: string): string {
  return rate === null ? empty : `${measuredPct(rate)} (${count}/${n})`;
}

export const OPEN_BETA_CONTINUITY_REASON = {
  ok: (days: number) => (days === 0 ? "오늘 실행 성공" : `${days}영업일 전 실행 성공`),
  stale: (days: number) => `마지막 성공 ${days}영업일 전`,
  not_ok: "마지막 실행이 채점까지 가지 못함",
  no_marker: "실행 기록 없음",
  unavailable: "실행 기록 조회 실패",
} as const;
export const OPEN_BETA_UNAVAILABLE = "조회 실패";
