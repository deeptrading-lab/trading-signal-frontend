/**
 * 모의투자 세션 생성 요청 검증 — route.ts(BFF)에서 사용, 실패 사유(한글) 또는 null.
 *
 * 판단 방식 허용 목록:
 * - `mock`: MVP 룰 판단(기본).
 * - `cli-agent`: 장중 단타 경량 에이전트 그룹(intraday-scalping-agent) — 단타워치 모의 단타 진입점.
 * - `existing-ai` 는 runTick 미구현(무단 mock 폴백 방지)이라 계속 거절한다.
 */

import type { CreatePaperTradingSessionRequest } from "@/lib/types/paperTrading/paperTrading";

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
  return null;
}
