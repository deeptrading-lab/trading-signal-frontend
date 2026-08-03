import {
  INTRADAY_TIMEFRAME_BY_INTERVAL,
  type PaperTradingCostModel,
  type PaperTradingRiskMode,
} from "@/lib/types/paperTrading/paperTrading";

export const PAPER_TRADING_DEFAULT_INITIAL_CASH = 10_000_000;
export const PAPER_TRADING_DEFAULT_TICK_INTERVAL_MINUTES = 30;
export const PAPER_TRADING_DEFAULT_MAX_POSITION_PCT = 50;
export const PAPER_TRADING_DEFAULT_CASH_BUFFER_PCT = 10;
export const PAPER_TRADING_MAX_STALE_PRICE_SECONDS = 180;
export const PAPER_TRADING_POSITION_HARD_STOP_PCT = -5;
export const PAPER_TRADING_SESSION_HARD_STOP_PCT = -7;
export const PAPER_TRADING_MAX_TURNOVER_PER_TICK_PCT = 50;

// ─── 과거 내역 페이지네이션(intraday-history-pagination) ──────────────────────
// 인메모리 창(HYDRATE_SESSION_LIMIT=20)과 무관한 별개 축 — 원장을 페이지 단위로 읽는다.
// env 손잡이 없이 코드 상수로만 조정한다.

/** "더 보기" 1페이지 기본 행 수. */
export const PAPER_TRADING_HISTORY_PAGE_SIZE = 20;
/** 요청 limit 상한 — 한 번에 과하게 긁어가지 못하게. */
export const PAPER_TRADING_HISTORY_MAX_PAGE_SIZE = 50;
/** 요청 offset 상한 — 무한 페이징 폭주 방지(원장 규모 대비 충분히 큼). */
export const PAPER_TRADING_HISTORY_MAX_OFFSET = 5_000;

// ─── 하드스톱(포지션/세션 손실 한도) 배선 ─────────────────────────────────────
// intraday-stop-slippage B/C. cli-agent 단타의 백스톱 — mock 경로는 무영향(forcedExit 미지정).

/** 하드스톱 % 허용 범위(음수) — 검증·UI 공용. −20 ≤ v ≤ −1, 또는 null(끄기). */
export const PAPER_TRADING_HARD_STOP_MIN_PCT = -20;
export const PAPER_TRADING_HARD_STOP_MAX_PCT = -1;

/**
 * riskMode 연동 포지션 하드스톱 기본값(%) — 명시 override 미지정 시 이 값으로 스탬프한다
 * (PRD §7 q4: riskMode 연동 + 명시 override). 보수 −3 / 균형 −5 / 공격 −8.
 */
export function defaultPositionHardStopPct(riskMode: PaperTradingRiskMode): number {
  if (riskMode === "conservative") return -3;
  if (riskMode === "aggressive") return -8;
  return -5;
}

/**
 * 세션의 유효 포지션 하드스톱(%) 해석 — forced-exit 주입용.
 * `null`=명시적 끄기(그대로 null 반환 → 하드스톱 미적용) / `undefined`=레거시 → riskMode 기본 /
 * 숫자=세션 설정값. 동적 손절선은 이 값과 무관하게 항상 유지된다(끄기여도 손절선은 작동).
 */
export function resolvePositionHardStopPct(session: {
  positionHardStopPct?: number | null;
  riskMode: PaperTradingRiskMode;
}): number | null {
  if (session.positionHardStopPct === null) return null;
  if (session.positionHardStopPct === undefined) return defaultPositionHardStopPct(session.riskMode);
  return session.positionHardStopPct;
}

/** 세션의 유효 세션 하드스톱(%) 해석 — `null`=끄기 / `undefined`=기본 −7 / 숫자=설정값. */
export function resolveSessionHardStopPct(session: {
  sessionHardStopPct?: number | null;
}): number | null {
  if (session.sessionHardStopPct === null) return null;
  if (session.sessionHardStopPct === undefined) return PAPER_TRADING_SESSION_HARD_STOP_PCT;
  return session.sessionHardStopPct;
}

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
/**
 * judge 확신 점수(convictionScore 0~100) 결정론 컷 — LLM 은 점수만 내고, BUY/SELL 판정은
 * 코드가 한다(PRD intraday-decision-overhaul PR-3a: judge 942회 실질 100% HOLD 의 해체).
 * 초기값 65/40 은 PM 권고(§9 q1 — LLM 점수가 5단위로 군집).
 * ★2026-07-22 재보정 65→58: I1~I3(일봉 컨텍스트·A+셋업 우선순위·수급 필터) 적용 후 judge 가
 * 훨씬 보수적이 되어 conviction 분포가 통째로 하향(개선 2일 평균 44·최대 68) → 65 컷이 사실상
 * 미달(실매매 ~0건). 58 = 개선 2일(7/21·22) claude conviction P82(상위 18% 통과) — 개선된 선별
 * 판단이 실제 매매로 '실현' 데이터를 쌓게 여는 값(과선별 해소). 반사실 convSpear 는 양전이나 매매 0.
 */
export const PAPER_TRADING_INTRADAY_BUY_CONVICTION_MIN = envInt(
  "INTRADAY_BUY_CONVICTION_MIN",
  58,
  50,
  90,
);
/** 보유 중 확신이 이 값 이하로 떨어지면 전량 청산(SELL) — 위 컷과 쌍(히스테리시스 밴드). */
export const PAPER_TRADING_INTRADAY_SELL_CONVICTION_MAX = envInt(
  "INTRADAY_SELL_CONVICTION_MAX",
  40,
  10,
  50,
);
/**
 * 청산 후 재진입 쿨다운(틱 수) — 컷 경계 진동이 왕복비용(~0.28%)을 갉아먹는 churn 방지 +
 * "하루 왕복 2~5회" 목표 장치(PRD §9 q2 — 기본 2틱 = 5분 주기 기준 10분 대기).
 */
export const PAPER_TRADING_INTRADAY_REENTRY_COOLDOWN_TICKS = envInt(
  "INTRADAY_REENTRY_COOLDOWN_TICKS",
  2,
  0,
  10,
);
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
