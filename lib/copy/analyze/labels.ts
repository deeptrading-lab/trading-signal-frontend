/**
 * AI 분석 토큰 사용량 대시보드 — UI 노출 한글 카피.
 * ticker·API 필드·고유명사 외에는 한글 기본(AGENTS.md 작업 원칙).
 */

/** 페이지 헤더 — 결과 카드 + 토큰 대시보드를 아우르는 상위 제목. */
export const ANALYZE_PAGE_TITLE = "AI 분석";
export const ANALYZE_PAGE_SUBTITLE =
  "지금까지 분석한 종목의 결론과 토큰 사용량을 모아 봅니다.";

/** 상위 탭 — 분석 결과 카드 / 토큰 사용량 대시보드 전환. */
export const TAB_RESULTS = "분석 결과";
export const TAB_USAGE = "토큰 사용량";

export const USAGE_TITLE = "AI 분석 토큰 사용량";
export const USAGE_SUBTITLE = "분석가별 토큰을 줄일 최적화 포인트를 찾기 위한 대시보드";

// ─── 분석 결과 카드 목록 ─────────────────────────────────────────────────────
export const RESULTS_LOADING = "분석 결과를 불러오는 중…";
export const RESULTS_ERROR = "분석 결과를 불러오지 못했어요.";

/** Supabase 미설정 시 안내. */
export const RESULTS_NOT_CONFIGURED_TITLE = "분석 저장소가 아직 연결되지 않았어요";
export const RESULTS_NOT_CONFIGURED_BODY =
  "Supabase(SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY)를 설정하면 분석 실행 시 결론이 여기에 쌓입니다.";

/** 연결됐지만 저장된 결론이 0건일 때. */
export const RESULTS_EMPTY_TITLE = "아직 분석한 종목이 없어요";
export const RESULTS_EMPTY_BODY =
  "종목 상세에서 AI 종합 분석을 한 번 실행하면 결론 카드가 여기에 쌓입니다.";

export const resultsCount = (n: number): string => `종목 ${n}개`;

/** 결과 카드 검색. */
export const RESULTS_SEARCH_PLACEHOLDER = "종목명 또는 코드로 검색";
export const RESULTS_SEARCH_EMPTY_TITLE = "검색 결과가 없어요";
export const RESULTS_SEARCH_EMPTY_BODY = "다른 종목명이나 코드로 검색해 보세요.";

/** 카드 토큰 줄. */
export const CARD_TOKENS_LABEL = "총 토큰";
export const CARD_COST_LABEL = "비용";
export const CARD_TOKENS_NONE = "토큰 기록 없음";
export const CARD_VIEW_DETAIL = "상세 보기";
/** 카드 호버 시 블러 오버레이 위에 뜨는 문구(종목명 아래 줄). */
export const CARD_OVERLAY_VIEW = "AI 분석 전체보기";

/** 상세 시트. */
export const DETAIL_CLOSE = "닫기";
export const DETAIL_PROVIDER_PREFIX = "분석 엔진";

// ─── 재분석 ──────────────────────────────────────────────────────────────────
/**
 * 카드·상세에서 저장된 결론을 다시 분석. 확인하면 우측 AI 분석 패널이 열려
 * (종목 상세의 "AI 종합 분석" 버튼과 동일) 공급자 선택→분석으로 이어진다.
 * 실행이 끝나면 기존 결론은 새 결과로 교체된다(Supabase upsert).
 */
export const REANALYZE_LABEL = "재분석";
export const REANALYZE_RUNNING = "분석 중…";
/** 카드 우상단 케밥(⋮) 메뉴 — 현재 항목은 재분석 하나. */
export const CARD_MENU_LABEL = "카드 메뉴";
export const REANALYZE_CONFIRM_TITLE = "다시 분석할까요?";
export const reanalyzeConfirmDesc = (name: string): string =>
  `${name}의 기존 분석 결과는 사라지고 새 결과로 교체돼요.`;
export const REANALYZE_CONFIRM_HINT =
  "확인하면 우측 AI 분석 패널에서 분석 엔진을 골라 다시 분석합니다.";
// 확인 시 즉시 분석이 아니라 우측 패널을 여는 진행 버튼이라 "확인"(재분석 X).
export const REANALYZE_CONFIRM_OK = "확인";
export const REANALYZE_CONFIRM_CANCEL = "취소";

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
/** codex는 비용(USD)만 미측정 — 토큰·소요시간은 측정된다. */
export const CODEX_UNMEASURED_NOTICE =
  "Codex CLI는 비용(USD)을 제공하지 않아 비용 지표만 비어 있습니다. 토큰·소요시간은 측정됩니다.";
export const MEASURE_BADGE_UNMEASURED = "측정 안 됨";

// ─── 지표 카드 ─────────────────────────────────────────────────────────────────
export const CARD_AVG_COST = "분석 1회 평균 비용";
export const CARD_TOTAL_AVG_INPUT = "평균 입력 토큰(합)";
export const CARD_TOTAL_AVG_OUTPUT = "평균 출력 토큰(합)";
export const CARD_CACHE_HIT = "캐시 적중률";
export const CARD_CACHE_HINT =
  "캐시 읽기는 싸지만(≈0.1x), 그 컨텍스트를 처음 쓰는 캐시 생성(≈1.25x)이 진짜 비용입니다. 적중률이 높아도 비용이 클 수 있어요.";
export const CARD_WALL_CLOCK = "분석 1회 평균 소요";
export const CARD_WALL_CLOCK_HINT =
  "에이전트 소요의 단순 합이 아니라 병렬 단계를 반영한 실제 wall-clock(첫 시작~마지막 종료)입니다.";

// ─── 차트 ──────────────────────────────────────────────────────────────────────
export const CHART_BAR_TITLE = "분석가별 평균 토큰";
export const CHART_BAR_HINT = "입력(신규+캐시)과 출력 분해 — 막대가 길수록 절감 여지가 큽니다.";
export const CHART_TREND_TITLE = "단계별 입력 토큰 추세";
export const CHART_TREND_HINT =
  "봉우리는 웹검색 분석가(뉴스·기본·SNS)의 tool-loop에서 fetch한 웹 컨텍스트가 캐시로 재사용된 것입니다. 신규(과금) 입력은 작고 평탄해요 — 절감 1순위는 웹분석가 fetch 컨텍스트입니다.";

export const LEGEND_FRESH_INPUT = "신규 입력";
export const LEGEND_CACHE_READ = "캐시 입력";
export const LEGEND_OUTPUT = "출력";

// ─── 모델별 비용 분해 ────────────────────────────────────────────────────────────
export const MODEL_COST_TITLE = "모델별 비용 (분석 1회 기준)";
/** 단가 값은 components/analyze/modelBreakdown.ts MODEL_RATES 와 정합 유지. */
export const MODEL_COST_HINT =
  "비용은 실제 청구(CLI) 기준이라 위 ‘분석 1회 평균 비용’과 합이 같습니다. " +
  "공개 단가(1M토큰당, 입력/출력): opus $5/$25 · sonnet $3/$15 · haiku $1/$5 — " +
  "opus는 토큰이 적어도 비용 비중이 큰 이유예요.";
export const MODEL_COL_MODEL = "모델";
export const MODEL_COL_AGENTS = "분석가 수";
export const MODEL_COL_INPUT = "입력(+캐시)";
export const MODEL_COL_OUTPUT = "출력";
export const MODEL_COL_COST = "비용";
export const MODEL_COL_SHARE = "비용 비중";

// ─── 테이블 ────────────────────────────────────────────────────────────────────
export const TABLE_TITLE = "분석가별 상세";
export const COL_AGENT = "분석가";
export const COL_STAGE = "단계";
export const COL_MODEL = "모델";
export const COL_AVG_INPUT = "평균 입력";
export const COL_FRESH = "신규 입력";
export const COL_CACHE_READ = "캐시 입력";
export const COL_CACHE_HIT = "적중률";
export const COL_AVG_OUTPUT = "평균 출력";
export const COL_AVG_COST = "평균 비용";
export const COL_DURATION = "평균 소요";
export const COL_SAMPLES = "표본";

export const STAGE_LABEL: Record<"A" | "B" | "C", string> = {
  A: "분석가",
  B: "토론",
  C: "매니저",
};
