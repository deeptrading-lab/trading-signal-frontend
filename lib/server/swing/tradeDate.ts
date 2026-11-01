/**
 * 스윙 판정 기준일 t — "오늘(KST) 이전의 마지막 거래일" = KOSPI 지수 일봉의 마지막 봉.
 *
 * 휴장일·주말·월요일(t = 금요일)을 따로 다룰 필요가 없다. 장중에 불러도 오늘 봉은 미확정이라 제외한다
 * (스크리너는 다음 날 아침 확정 데이터로 돈다 — PRD `swing-judgment` §10).
 */

import { fetchIndexDailyChart } from "@/lib/api/kis/index-chart";
import type { KisCall } from "./pace";

/** YYYY-MM-DD(KST). */
export function kstToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 3_600_000).toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const ymd = (iso: string) => iso.replaceAll("-", "");

/** 지수 봉 날짜들 중 today(KST) 보다 이른 마지막 날짜. 없으면 null. */
export function pickTradeDate(indexDates: string[], todayKst: string): string | null {
  let best: string | null = null;
  for (const d of indexDates) if (d < todayKst && (best === null || d > best)) best = d;
  return best;
}

export async function resolveTradeDate(call: KisCall, now: Date = new Date()): Promise<string | null> {
  const today = kstToday(now);
  const rows = await call(() => fetchIndexDailyChart("0001", ymd(addDays(today, -20)), ymd(today)));
  return pickTradeDate(
    rows.map((r) => r.date),
    today,
  );
}
