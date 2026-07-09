import { PAPER_TRADING_DEFAULT_TICK_INTERVAL_MINUTES } from "@/lib/server/paperTrading/constants";

export function floorToTickWindow(
  date: Date,
  intervalMinutes = PAPER_TRADING_DEFAULT_TICK_INTERVAL_MINUTES,
): string {
  const copy = new Date(date);
  const intervalMs = intervalMinutes * 60_000;
  copy.setTime(Math.floor(copy.getTime() / intervalMs) * intervalMs);
  return copy.toISOString();
}

export function addTickWindow(
  iso: string,
  intervalMinutes = PAPER_TRADING_DEFAULT_TICK_INTERVAL_MINUTES,
): string {
  return new Date(new Date(iso).getTime() + intervalMinutes * 60_000).toISOString();
}

/**
 * A(60초 리스크 스윕) 전용 틱 창 — 분(minute) 바닥 + **30초**(intraday-stop-slippage).
 *
 * ⚠️ 창 dedup 충돌 방지: 5분 LLM 틱 창은 항상 초=00(`floorToTickWindow`)이라, 리스크 스윕 창을
 *   초=30 으로 고정하면 어떤 주기의 LLM 창과도 **절대 같아지지 않는다** → runTick 의
 *   `tickWindowStart` dedup 이 리스크 틱과 5분 틱을 섞지 않고, LLM 틱 창을 리스크 틱이 삼키지 않는다.
 *   유효 ISO(파싱 가능)를 유지하므로 kstHhmm(15:20 flatten)·표시에도 안전하다. 같은 분 재실행은
 *   같은 창이지만, 첫 청산이 무포지션으로 만들어 두 번째 스윕은 무포지션 스킵(멱등).
 */
export function riskSweepTickWindow(now: Date): string {
  const copy = new Date(now);
  copy.setSeconds(30, 0);
  return copy.toISOString();
}
