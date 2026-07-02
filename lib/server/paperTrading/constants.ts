import type { PaperTradingCostModel } from "@/lib/types/paperTrading/paperTrading";

export const PAPER_TRADING_DEFAULT_INITIAL_CASH = 10_000_000;
export const PAPER_TRADING_DEFAULT_TICK_INTERVAL_MINUTES = 30;
export const PAPER_TRADING_DEFAULT_MAX_POSITION_PCT = 50;
export const PAPER_TRADING_DEFAULT_CASH_BUFFER_PCT = 10;
export const PAPER_TRADING_MAX_STALE_PRICE_SECONDS = 180;
export const PAPER_TRADING_POSITION_HARD_STOP_PCT = -5;
export const PAPER_TRADING_SESSION_HARD_STOP_PCT = -7;
export const PAPER_TRADING_MAX_TURNOVER_PER_TICK_PCT = 50;

// ─── 장중 단타(cli-agent) 전용 ────────────────────────────────────────────────
/** 단타 기본 틱/판단 주기(분) — 백테스트 확정 전 5분으로 시작. */
export const PAPER_TRADING_INTRADAY_TICK_INTERVAL_MINUTES = 5;
/** 분봉 단위(분) — 시그널/레벨 계산 타임프레임. 3/5/15 중 선택, 기본 5. */
export const PAPER_TRADING_INTRADAY_TIMEFRAME = 5;
/** 단타 익절 목표 캡(%) — 과욕 차단(사후 게이트). */
export const PAPER_TRADING_INTRADAY_TAKE_PROFIT_PCT = 5;
/** 세션 일일 손실 kill(%) — 도달 시 신규 진입 차단(관리/청산만). */
export const PAPER_TRADING_DAILY_LOSS_KILL_PCT = -3;
/** 장 막판 강제 청산 시각(KST "HH:mm") — 단타는 오버나잇 보유 없음. */
export const PAPER_TRADING_CLOSE_FLATTEN_HHMM = "15:20";
/** 단타 warmup 전일 분봉 prefetch 거래일 수. */
export const PAPER_TRADING_INTRADAY_PRIOR_DAYS = 1;
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
