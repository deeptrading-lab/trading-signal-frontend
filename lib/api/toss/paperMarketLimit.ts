import { makeTossTransportError } from "./errors";

export const PAPER_MARKET_INTERVAL_MS = 60_000;
export const PAPER_MARKET_SOURCE = "program-paper";
const registry = globalThis as typeof globalThis & { tossPaperMarketLimit?: { nextAt: number } };
const limit = registry.tossPaperMarketLimit ??= { nextAt: 0 };

export function nextPaperMarketRequestAt() {
  return limit.nextAt;
}

export function assertPaperMarketRequestAllowed(now: number) {
  if (now < limit.nextAt) {
    throw makeTossTransportError({ status: 503, message: "다음 토스 시세 조회 시간을 기다리고 있어요." });
  }
}

export function reservePaperMarketRequest(now: number) {
  assertPaperMarketRequestAllowed(now);
  limit.nextAt = now + PAPER_MARKET_INTERVAL_MS;
}

export function observePaperMarket429(retryAfter: unknown, now: number) {
  if (typeof retryAfter !== "string" && typeof retryAfter !== "number") return;
  if (String(retryAfter).trim() === "") return;
  const seconds = Number(retryAfter);
  const until = Number.isFinite(seconds) ? now + Math.max(0, seconds) * 1_000 : Date.parse(String(retryAfter));
  if (Number.isFinite(until)) limit.nextAt = Math.max(limit.nextAt, until);
}

export function resetPaperMarketLimitForTest() {
  limit.nextAt = 0;
}
