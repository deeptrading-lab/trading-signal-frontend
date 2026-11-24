import type { AxiosResponse } from "axios";
import { delay } from "@/lib/server/bffUtils";
import { makeTossBusinessError, makeTossTransportError } from "./errors";

const minimumInterval = { STOCK: 250, MARKET_DATA: 100 };
type Group = keyof typeof minimumInterval;

const marketDataPaths = new Set([
  "/api/v1/orderbook", "/api/v1/prices", "/api/v1/trades", "/api/v1/price-limits",
]);

export function getPacedTossGroup(path: string): Group | undefined {
  if (path === "/api/v1/stocks" || /^\/api\/v1\/stocks\/[^/]+\/warnings$/.test(path)) return "STOCK";
  if (marketDataPaths.has(path)) return "MARKET_DATA";
}

function createLimit(group: Group) {
  return { nextAt: 0, cooldownUntil: 0, intervalMs: minimumInterval[group], consecutive429: 0 };
}

const shared = globalThis as typeof globalThis & {
  tossRestGroupLimits?: Record<Group, ReturnType<typeof createLimit>>;
};
const limits = shared.tossRestGroupLimits ??= {
  STOCK: createLimit("STOCK"),
  MARKET_DATA: createLimit("MARKET_DATA"),
};

export function resetRestRateLimitsForTest() {
  Object.assign(limits.STOCK, createLimit("STOCK"));
  Object.assign(limits.MARKET_DATA, createLimit("MARKET_DATA"));
}

export async function waitForTossGroupSlot(group: Group, deadline: number) {
  const limit = limits[group];
  for (;;) {
    const now = Date.now();
    const readyAt = Math.max(now, limit.nextAt, limit.cooldownUntil);
    if (readyAt >= deadline) {
      if (limit.cooldownUntil > now) throw makeTossBusinessError(429, undefined);
      throw makeTossTransportError({ status: 503, message: "토스증권 조회가 밀려 잠시 후 다시 조회할 수 있어요." });
    }
    if (readyAt === now) {
      limit.nextAt = now + limit.intervalMs;
      return;
    }
    await delay(readyAt - now);
  }
}

function readNumber(header: unknown) {
  if ((typeof header !== "number" && typeof header !== "string") || header === "") return undefined;
  const value = Number(header);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

export function observeTossGroupResponse(group: Group, { status, headers }: AxiosResponse, sentAt: number) {
  const limit = limits[group];
  const now = Date.now();
  const quota = readNumber(headers?.["x-ratelimit-limit"]);
  const remaining = readNumber(headers?.["x-ratelimit-remaining"]);
  const resetSeconds = readNumber(headers?.["x-ratelimit-reset"]);
  if (quota !== undefined && quota > 0) {
    limit.intervalMs = Math.max(minimumInterval[group], Math.ceil(1_000 / quota));
    limit.nextAt = Math.max(limit.nextAt, sentAt + limit.intervalMs);
  }
  if (remaining === 0 && resetSeconds !== undefined) {
    limit.cooldownUntil = Math.max(limit.cooldownUntil, now + Math.ceil(resetSeconds * 1_000));
  }
  if (status === 200 && sentAt >= limit.cooldownUntil) limit.consecutive429 = 0;
  if (status === 429) {
    const retryAfter = headers?.["retry-after"];
    const seconds = readNumber(retryAfter);
    const date = typeof retryAfter === "string" ? Date.parse(retryAfter) : NaN;
    const retryMs = seconds === undefined ? (Number.isFinite(date) ? date - now : 0) : Math.ceil(seconds * 1_000);
    limit.consecutive429 = Math.min(limit.consecutive429 + 1, 5);
    const backoff = 1_000 * 2 ** (limit.consecutive429 - 1);
    const pause = Math.max(retryMs, backoff) + Math.floor(Math.random() * 250);
    limit.cooldownUntil = Math.max(limit.cooldownUntil, now + pause);
  }
  return { group, quota, remaining, resetSeconds, retryMs: Math.max(0, limit.cooldownUntil - now) };
}
