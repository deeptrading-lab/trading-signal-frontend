import type { AxiosResponse } from "axios";
import { delay, withTimeout } from "@/lib/server/bffUtils";
import { makeTossTransportError } from "./errors";

const MIN_INTERVAL_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
export const PAPER_CANDLE_ADMISSION_BUDGET_MS = 2_000;
export const STOCK_CANDLE_ADMISSION_BUDGET_MS = 3_000;

function createRateLimit() {
  return {
    nextAt: 0, cooldownUntil: 0, intervalMs: MIN_INTERVAL_MS, quotaIntervalMs: MIN_INTERVAL_MS, consecutive429: 0,
    inFlight: undefined as Promise<void> | undefined,
  };
}

// Next may load this module through multiple server bundles in the same process.
const shared = globalThis as typeof globalThis & {
  tossCandleRateLimit?: ReturnType<typeof createRateLimit>;
};
const limit = shared.tossCandleRateLimit ??= createRateLimit();

export function resetCandleRateLimitForTest() {
  Object.assign(limit, createRateLimit());
}

function queueTimeout() {
  return makeTossTransportError({
    status: 503,
    message: "토스증권 캔들 요청이 밀려 잠시 후 다시 조회할 수 있어요.",
    detail: { code: "toss-candle-queue-timeout" },
  });
}

export async function waitForCandleSlot(deadline: number): Promise<() => void> {
  for (;;) {
    const now = Date.now();
    const readyAt = Math.max(now, limit.nextAt, limit.cooldownUntil);
    if (readyAt >= deadline) throw queueTimeout();
    if (limit.inFlight) {
      await withTimeout(limit.inFlight, deadline - now).catch(() => { throw queueTimeout(); });
      continue;
    }
    if (readyAt === now) {
      limit.nextAt = now + limit.intervalMs;
      let release!: () => void;
      limit.inFlight = new Promise<void>(resolve => { release = resolve; });
      return () => {
        limit.inFlight = undefined;
        release();
      };
    }
    await delay(readyAt - now);
  }
}

function readNumber(header: unknown) {
  if ((typeof header !== "number" && typeof header !== "string") || header === "") return undefined;
  const value = Number(header);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

function readRetryAfter(header: unknown, now: number) {
  const seconds = readNumber(header);
  if (seconds !== undefined) return Math.ceil(seconds * 1_000);
  const date = typeof header === "string" ? Date.parse(header) : NaN;
  return Number.isFinite(date) ? Math.max(0, date - now) : undefined;
}

export function observeCandleResponse({ status, headers }: AxiosResponse, sentAt: number) {
  const now = Date.now();
  const recovered = status === 200 && limit.consecutive429 > 0 && sentAt >= limit.cooldownUntil;
  const quota = readNumber(headers?.["x-ratelimit-limit"]);
  const remaining = readNumber(headers?.["x-ratelimit-remaining"]);
  const resetSeconds = readNumber(headers?.["x-ratelimit-reset"]);
  const retryAfterMs = readRetryAfter(headers?.["retry-after"], now);
  if (quota !== undefined && quota > 0) {
    limit.quotaIntervalMs = Math.max(MIN_INTERVAL_MS, Math.ceil(1_100 / quota));
    limit.intervalMs = Math.max(limit.intervalMs, limit.quotaIntervalMs);
  }
  if (remaining !== undefined && remaining <= 1 && resetSeconds !== undefined) {
    limit.cooldownUntil = Math.max(limit.cooldownUntil, now + Math.ceil(resetSeconds * 1_000));
  }

  if (status === 200) {
    limit.consecutive429 = 0;
    limit.intervalMs = Math.max(limit.quotaIntervalMs, Math.ceil(limit.intervalMs / 2));
  }
  if (status === 429) {
    limit.consecutive429 = Math.min(limit.consecutive429 + 1, 5);
    const backoff = Math.min(MAX_BACKOFF_MS, 3_000 * 2 ** (limit.consecutive429 - 1));
    const resetMs = Math.ceil((resetSeconds ?? 0) * 1_000);
    const wait = Math.max(retryAfterMs ?? 0, resetMs, backoff) + Math.floor(Math.random() * 250);
    limit.intervalMs = Math.max(limit.intervalMs, Math.min(4_000, MIN_INTERVAL_MS * 2 ** limit.consecutive429));
    limit.cooldownUntil = Math.max(limit.cooldownUntil, now + wait);
  }

  limit.nextAt = Math.max(limit.nextAt, sentAt + limit.intervalMs);
  return {
    recovered,
    retryMs: Math.max(0, limit.cooldownUntil - now),
    retryAfterMs,
    quota,
    remaining,
    resetSeconds,
    intervalMs: limit.intervalMs,
  };
}
