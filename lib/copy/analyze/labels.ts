/**
 * AI 분석 토큰 사용량 대시보드 — UI 노출 한글 카피.
 * ticker·API 필드·고유명사 외에는 한글 기본(AGENTS.md 작업 원칙).
 */

export const USAGE_TITLE = "AI 분석 토큰 사용량";
export const USAGE_SUBTITLE = "분석가별 토큰을 줄일 최적화 포인트를 찾기 위한 대시보드";

export const USAGE_LOADING = "토큰 사용량을 불러오는 중…";
export const USAGE_ERROR = "토큰 사용량을 불러오지 못했어요.";
export const USAGE_RETRY = "다시 시도";
export const USAGE_REFRESH = "새로고침";

/** Supabase 미설정 시 안내. */
export const USAGE_NOT_CONFIGURED_TITLE = "토큰 저장소가 아직 연결되지 않았어요";
export const USAGE_NOT_CONFIGURED_BODY =
  "Supabase(SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY)를 설정하고, docs/sql/ai-agent-usage.sql 의 테이블을 생성하면 분석 실행 시 토큰이 누적됩니다.";

/** 데이터는 있으나 해당 provider 표본이 0일 때. */
export const USAGE_EMPTY_TITLE = "아직 집계된 분석이 없어요";
export const USAGE_EMPTY_BODY =
  "로컬에서 AI 종합 분석을 한 번 실행하면 분석가별 토큰이 여기에 쌓입니다.";

/** run 수 요약. */
export const usageRunCount = (n: number): string => `분석 ${n}회 기준`;

// ─── provider 탭 ───────────────────────────────────────────────────────────────
export const PROVIDER_TAB_CLAUDE = "Claude";
export const PROVIDER_TAB_CODEX = "Codex";
/** codex는 현재 토큰 미측정. */
export const CODEX_UNMEASURED_NOTICE =
  "Codex CLI는 현재 토큰 사용량을 제공하지 않아 측정되지 않습니다. 토큰 분석은 Claude 실행분을 사용하세요.";
export const MEASURE_BADGE_UNMEASURED = "측정 안 됨";

// ─── 지표 카드 ─────────────────────────────────────────────────────────────────
export const CARD_AVG_COST = "분석 1회 평균 비용";
export const CARD_TOTAL_AVG_INPUT = "평균 입력 토큰(합)";
export const CARD_TOTAL_AVG_OUTPUT = "평균 출력 토큰(합)";
export const CARD_CACHE_HIT = "캐시 적중률";
export const CARD_CACHE_HINT = "캐시 적중률이 높을수록 입력 비용이 절감됩니다.";

// ─── 차트 ──────────────────────────────────────────────────────────────────────
export const CHART_BAR_TITLE = "분석가별 평균 토큰";
export const CHART_BAR_HINT = "입력(신규+캐시)과 출력 분해 — 막대가 길수록 절감 여지가 큽니다.";
export const CHART_TREND_TITLE = "단계별 입력 토큰 추세";
export const CHART_TREND_HINT =
  "뒤 단계 분석가일수록 앞 리포트가 누적돼 입력이 커집니다. 가장 큰 지점이 1순위 절감 대상입니다.";

export const LEGEND_FRESH_INPUT = "신규 입력";
export const LEGEND_CACHE_READ = "캐시 입력";
export const LEGEND_OUTPUT = "출력";

// ─── 테이블 ────────────────────────────────────────────────────────────────────
export const TABLE_TITLE = "분석가별 상세";
export const COL_AGENT = "분석가";
export const COL_STAGE = "단계";
export const COL_AVG_INPUT = "평균 입력";
export const COL_FRESH = "신규 입력";
export const COL_CACHE_READ = "캐시 입력";
export const COL_CACHE_HIT = "적중률";
export const COL_AVG_OUTPUT = "평균 출력";
export const COL_AVG_COST = "평균 비용";
export const COL_SAMPLES = "표본";

export const STAGE_LABEL: Record<"A" | "B" | "C", string> = {
  A: "분석가",
  B: "토론",
  C: "매니저",
};
