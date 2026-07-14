/**
 * isPaperSessionStalled — 판단이 "멈춘"(stalled) running 세션 판정.
 *
 * 단타 세션은 장중(평일 09:00~15:40) 주기마다 자동 틱하는데, dev 스케줄러가 hang 등으로 멈추면
 * 상태는 여전히 "running" 인데 판단이 특정 시각에서 끊긴다(사용자 지적). 이를 UI 에 "판단 끊김"으로
 * 표시해 재시작을 유도하기 위한 순수 판정.
 *
 * - **장 마감/주말은 예외**(false): 그땐 안 도는 게 정상(15:40 이후 자동 완료 대기·주말 휴장).
 * - running 이 아니면 false(일시정지·완료는 의도된 정지).
 * - 마지막 틱 창(`lastTickWindowStart`, 없으면 `startedAt`)이 **2 주기 + 분석 여유(2분)** 넘게
 *   끊기면 멈춤으로 본다.
 *
 * `isKstMarketHoursWithCloseGrace` 는 순수 util 이라 클라이언트 안전.
 */

import { isKstMarketHoursWithCloseGrace } from "@/lib/utils/kstMarketHours";
import type { PaperTradingSession } from "@/lib/types/paperTrading/paperTrading";

type StaleInput = Pick<
  PaperTradingSession,
  "status" | "tickIntervalMinutes" | "lastTickWindowStart" | "startedAt"
>;

/** 분석 지연 등 정상 변동을 흡수하는 여유(ms). */
const ANALYSIS_GRACE_MS = 120_000;

export function isPaperSessionStalled(
  session: StaleInput,
  now: Date = new Date(),
): boolean {
  if (session.status !== "running") return false;
  // 장 마감·주말은 안 도는 게 정상 — 멈춤 아님(사용자: 마감 자동정지는 예외).
  if (!isKstMarketHoursWithCloseGrace(now)) return false;

  const lastMs = Date.parse(session.lastTickWindowStart ?? session.startedAt);
  if (!Number.isFinite(lastMs)) return false;

  const intervalMs = Math.max(1, session.tickIntervalMinutes) * 60_000;
  // 2 주기 넘게 판단이 없으면(분석 여유 포함) 멈춤.
  return now.getTime() - lastMs > intervalMs * 2 + ANALYSIS_GRACE_MS;
}
