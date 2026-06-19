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
