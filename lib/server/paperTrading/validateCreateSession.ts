/**
 * 모의투자 세션 생성 요청 검증 — route.ts(BFF)에서 사용, 실패 사유(한글) 또는 null.
 *
 * 판단 방식 허용 목록:
 * - `mock`: MVP 룰 판단(기본).
 * - `cli-agent`: 장중 단타 경량 에이전트 그룹(intraday-scalping-agent) — 단타워치 모의 단타 진입점.
 * - `existing-ai` 는 runTick 미구현(무단 mock 폴백 방지)이라 계속 거절한다.
 */

import {
  PAPER_TRADING_HARD_STOP_MAX_PCT,
  PAPER_TRADING_HARD_STOP_MIN_PCT,
} from "@/lib/server/paperTrading/constants";
import {
  PAPER_TRADING_INTRADAY_INTERVAL_OPTIONS,
  type CreatePaperTradingSessionRequest,
} from "@/lib/types/paperTrading/paperTrading";

/**
 * 하드스톱 % 검증 — `null`(끄기)·`undefined`(미지정)은 허용, 숫자는 [−20, −1] 음수만.
 * 0·양수·범위 밖은 거절(intraday-stop-slippage C). 끄기 sentinel = null.
 */
function validateHardStopPct(value: number | null | undefined, label: string): string | null {
  if (value === undefined || value === null) return null;
  if (
    !Number.isFinite(value) ||
    value > PAPER_TRADING_HARD_STOP_MAX_PCT ||
    value < PAPER_TRADING_HARD_STOP_MIN_PCT
  ) {
    return `${label}은 ${PAPER_TRADING_HARD_STOP_MIN_PCT}%~${PAPER_TRADING_HARD_STOP_MAX_PCT}% 사이로 설정하거나 끌 수 있어요.`;
  }
  return null;
}

export function validateCreateSessionRequest(
  body: Partial<CreatePaperTradingSessionRequest>,
): string | null {
  if (body.tickers && (!Array.isArray(body.tickers) || body.tickers.length === 0)) {
    return "종목을 1개 이상 입력해 주세요.";
  }
  if (body.stocks && (!Array.isArray(body.stocks) || body.stocks.length === 0)) {
    return "종목을 1개 이상 선택해 주세요.";
  }
  if (body.stocks && body.stocks.length > 5) {
    return "MVP에서는 종목을 최대 5개까지 선택할 수 있어요.";
  }
  if (body.initialCash !== undefined && (!Number.isFinite(body.initialCash) || body.initialCash <= 0)) {
    return "시작 투자금은 0보다 커야 해요.";
  }
  if (
    body.targetReturnPct !== undefined &&
    (!Number.isFinite(body.targetReturnPct) || body.targetReturnPct <= 0)
  ) {
    return "목표 수익률은 0보다 커야 해요.";
  }
  if (
    body.decisionProvider &&
    body.decisionProvider !== "mock" &&
    body.decisionProvider !== "cli-agent"
  ) {
    return "판단 방식은 MVP(mock) 또는 장중 단타 에이전트(cli-agent)만 사용할 수 있어요. 실행에는 Codex 또는 Claude CLI가 필요합니다.";
  }
  if (
    body.tickIntervalMinutes !== undefined &&
    !(PAPER_TRADING_INTRADAY_INTERVAL_OPTIONS as readonly number[]).includes(
      body.tickIntervalMinutes,
    )
  ) {
    return `판단 주기는 ${PAPER_TRADING_INTRADAY_INTERVAL_OPTIONS.join("·")}분 중에서 선택해 주세요.`;
  }
  const positionHardStopError = validateHardStopPct(body.positionHardStopPct, "손절 상한");
  if (positionHardStopError) return positionHardStopError;
  const sessionHardStopError = validateHardStopPct(body.sessionHardStopPct, "세션 손절 상한");
  if (sessionHardStopError) return sessionHardStopError;
  return null;
}
