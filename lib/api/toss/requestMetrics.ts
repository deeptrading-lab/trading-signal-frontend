import type { AxiosResponse } from "axios";
import { getPacedTossGroup } from "./restRateLimit";

const RETENTION_MS = 300_000;
const MAX_ATTEMPTS = 10_000;

type Attempt = {
  path: string;
  group: string;
  source: string;
  sentAt: number;
  status?: number;
  finishedAt?: number;
};

function createMetrics() {
  return { attempts: [] as Attempt[], startedAt: Date.now(), evictedAt: -Infinity };
}

const registry = globalThis as typeof globalThis & {
  tossRequestMetrics?: ReturnType<typeof createMetrics>;
};
const metrics = registry.tossRequestMetrics ??= createMetrics();

export function resetTossRequestMetricsForTest() {
  Object.assign(metrics, createMetrics());
}

export function recordTossDispatch(path: string, sentAt: number, source = "stock-data"): Attempt {
  const group = getPacedTossGroup(path)
    ?? (path === "/api/v1/candles" ? "MARKET_DATA_CHART"
      : path === "/api/v1/rankings" ? "RANKING"
        : path === "/oauth2/token" ? "AUTH"
          : path === "/api/v1/exchange-rate" || path.startsWith("/api/v1/market-calendar/") ? "MARKET_INFO" : "OTHER");
  const attempt = {
    path: path.replace(/^\/api\/v1\/stocks\/[^/]+\/warnings$/, "/api/v1/stocks/{symbol}/warnings"),
    group, source, sentAt,
  };
  const expiredIndex = metrics.attempts.findIndex(request => request.sentAt >= sentAt - RETENTION_MS);
  if (expiredIndex === -1) metrics.attempts.length = 0;
  else if (expiredIndex > 0) metrics.attempts.splice(0, expiredIndex);
  if (metrics.attempts.length === MAX_ATTEMPTS) metrics.evictedAt = metrics.attempts.shift()!.sentAt;
  metrics.attempts.push(attempt);
  return attempt;
}

export function recordTossResult(attempt: Attempt, status?: number) {
  attempt.status = status;
  attempt.finishedAt = Date.now();
}

function counts(requests: Attempt[], sentAt: number) {
  return {
    last1s: requests.filter(request => request.sentAt > sentAt - 1_000).length,
    last5s: requests.filter(request => request.sentAt > sentAt - 5_000).length,
    last60s: requests.filter(request => request.sentAt > sentAt - 60_000).length,
  };
}

export function logTossRateLimit(attempt: Attempt, response: AxiosResponse, diagnostics?: Record<string, unknown>) {
  const { sentAt, group, source, path } = attempt;
  // Use dispatch time so even a slow 429 keeps the burst that preceded it.
  const preceding = metrics.attempts.slice(0, metrics.attempts.indexOf(attempt) + 1);
  const sameGroup = preceding.filter(request => request.group === group);
  const previous = sameGroup.at(-2);
  const last60s = preceding.filter(request => request.sentAt > sentAt - 60_000);
  const breakdown = new Map<string, { group: string; path: string; source: string; sent: number; rateLimited: number }>();
  for (const request of last60s) {
    const key = `${request.group}:${request.path}:${request.source}`;
    const row = breakdown.get(key) ?? { group: request.group, path: request.path, source: request.source, sent: 0, rateLimited: 0 };
    row.sent++;
    if (request.status === 429) row.rateLimited++;
    breakdown.set(key, row);
  }
  const headers = response.headers;
  const log = {
    at: new Date().toISOString(), path, kind: "rate-limit", status: 429, ...diagnostics, group, source,
    limitHeaders: {
      limit: headers?.["x-ratelimit-limit"], remaining: headers?.["x-ratelimit-remaining"],
      reset: headers?.["x-ratelimit-reset"], retryAfter: headers?.["retry-after"],
    },
    traffic: {
      pid: process.pid,
      observedForMs: Math.max(0, sentAt - metrics.startedAt),
      truncated: metrics.evictedAt > sentAt - 60_000,
      allSent: counts(last60s, sentAt),
      groupSent: counts(last60s.filter(request => request.group === group), sentAt),
      previousGroupDispatchMs: previous && sentAt - previous.sentAt,
      responseMs: (attempt.finishedAt ?? Date.now()) - sentAt,
      byGroupPathSource60s: [...breakdown.values()],
      recentGroupRequests: sameGroup.slice(-6).map(request => ({
        msBefore: sentAt - request.sentAt, path: request.path, source: request.source,
        result: request.status ?? (request.finishedAt === undefined ? "pending" : "transport-error"),
      })),
    },
  };
  console.warn(`[toss-rest] ${JSON.stringify(log)}`);
}
