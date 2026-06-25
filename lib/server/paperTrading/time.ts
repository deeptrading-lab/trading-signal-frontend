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
