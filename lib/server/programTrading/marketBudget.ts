const nextLog = new Map<string, number>();
export function logPaperMarket(event: string, detail: Record<string, unknown> = {}) {
  if (Date.now() < (nextLog.get(event) ?? 0)) return;
  nextLog.set(event, Date.now() + 30_000);
  console.warn("[program-paper]", event, { at: new Date().toISOString(), ...detail });
}
