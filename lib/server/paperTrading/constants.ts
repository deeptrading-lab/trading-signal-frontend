import {
  INTRADAY_TIMEFRAME_BY_INTERVAL,
  type PaperTradingCostModel,
} from "@/lib/types/paperTrading/paperTrading";

export const PAPER_TRADING_DEFAULT_INITIAL_CASH = 10_000_000;
export const PAPER_TRADING_DEFAULT_TICK_INTERVAL_MINUTES = 30;
export const PAPER_TRADING_DEFAULT_MAX_POSITION_PCT = 50;
export const PAPER_TRADING_DEFAULT_CASH_BUFFER_PCT = 10;
export const PAPER_TRADING_MAX_STALE_PRICE_SECONDS = 180;
export const PAPER_TRADING_POSITION_HARD_STOP_PCT = -5;
export const PAPER_TRADING_SESSION_HARD_STOP_PCT = -7;
export const PAPER_TRADING_MAX_TURNOVER_PER_TICK_PCT = 50;

// ─── 장중 단타(cli-agent) 전용 ────────────────────────────────────────────────

/** env 정수 파서 — 미설정/비정상은 fallback. */
function envInt(name: string, fallback: number, min: number, max: number): number {
  const raw = Number.parseInt(process.env[name] ?? "", 10);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, raw));
}

/**
 * 단타 틱/판단 주기(분) — `INTRADAY_TICK_INTERVAL_MINUTES` 로 조절(기본 5, 1~30).
 * 2분 등 단축 시 LLM 콜 빈도가 비례 증가(로컬 CLI 구독이라 토큰 과금은 없음).
 */
export const PAPER_TRADING_INTRADAY_TICK_INTERVAL_MINUTES = envInt(
  "INTRADAY_TICK_INTERVAL_MINUTES",
  5,
  1,
  30,
);
/**
 * 판단 주기(분) → 분봉 단위(분) 파생 — 매핑은 `INTRADAY_TIMEFRAME_BY_INTERVAL`(주기·봉 마감 정렬).
 * `INTRADAY_TIMEFRAME` env 는 실험용 강제 오버라이드(1/3/5/15)로만 동작하며 평시엔 비워둔다.
 * ⚠️ 1분봉은 페치 볼륨이 크다(KIS 30봉/콜 vs 토스 200봉/콜) — `MARKET_DATA_SOURCE=toss` 병행 권장.
 */
export function deriveIntradayTimeframe(intervalMinutes: number): number {
  const override = Number.parseInt(process.env.INTRADAY_TIMEFRAME ?? "", 10);
  if ([1, 3, 5, 15].includes(override)) return override;
  return INTRADAY_TIMEFRAME_BY_INTERVAL[intervalMinutes] ?? 5;
}
/** 단타 익절 목표 캡(%) — 과욕 차단(사후 게이트). */
export const PAPER_TRADING_INTRADAY_TAKE_PROFIT_PCT = 5;
/** 세션 일일 손실 kill(%) — 도달 시 신규 진입 차단(관리/청산만). */
export const PAPER_TRADING_DAILY_LOSS_KILL_PCT = -3;
/** 장 막판 강제 청산 시각(KST "HH:mm") — 단타는 오버나잇 보유 없음. */
export const PAPER_TRADING_CLOSE_FLATTEN_HHMM = "15:20";
/**
 * 단타 warmup 전일 분봉 prefetch 거래일 수 — `INTRADAY_PRIOR_DAYS` env 로 조절(기본 3, 1~5).
 * 3일 = graded 거래량 z-score(40봉 룩백)가 개장 직후부터 안정되게 하는 워밍업(PR-1b).
 * ⚠️ 콜드캐시 첫 페치가 일수에 비례해 늘어난다(KIS 1분봉 30봉/콜) — `MARKET_DATA_SOURCE=toss`
 *    (200봉/콜) 병행 권장. structureLookback(구조 룩백)은 별개 상수로 불변.
 */
export const PAPER_TRADING_INTRADAY_PRIOR_DAYS = envInt("INTRADAY_PRIOR_DAYS", 3, 1, 5);
/**
 * 단타 가상 체결 거래 비용 — cli-agent 세션에만 적용(mock 무변경).
 * 위탁수수료 0.015%/편도 + 매도 제세금 0.15% + 슬리피지 0.05%/편도 ≈ 왕복 ~0.28%.
 * 과거 단타 검증에서 비용이 net 수익 부호를 갈랐으므로 판단 품질 테스트의 전제 조건.
 */
export const PAPER_TRADING_INTRADAY_COSTS: PaperTradingCostModel = {
  feeBpPerSide: 1.5,
  sellTaxBp: 15,
  slippageBp: 5,
};
