import { setTimeout as sleep } from "node:timers/promises";

/** A slow market response can update its provider cache, but never a settled trading tick. */
export async function withinMarketBudget<T>(pending: Promise<T>, fallback: T, ms: number): Promise<T> {
  const timer = new AbortController();
  try {
    return await Promise.race([pending, sleep(ms, fallback, { signal: timer.signal })]);
  } finally {
    timer.abort();
  }
}

const nextLog = new Map<string, number>();
export function logPaperMarket(event: string, detail: Record<string, unknown> = {}) {
  if (Date.now() < (nextLog.get(event) ?? 0)) return;
  nextLog.set(event, Date.now() + 30_000);
  console.warn("[program-paper]", event, { at: new Date().toISOString(), ...detail });
}
