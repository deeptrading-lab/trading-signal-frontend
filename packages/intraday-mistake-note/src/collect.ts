import { createHash } from "node:crypto";
import { resolveServerOperator } from "../../../lib/server/paperTrading/operator";
import type {
  PaperTradingSession,
  PaperTradingTick,
} from "../../../lib/types/paperTrading/paperTrading";
import type {
  AutopilotRun,
  AutopilotScreenerSnapshot,
} from "../../../lib/types/paperTrading/autopilot";
import type { IntradayTickLabelPayload } from "../../../lib/types/intraday/tickLabels";
import type { CollectedDay, StoredTickLabel } from "./types";

const PAGE_SIZE = 1_000;
const MAX_ROWS = 20_000;
const FETCH_TIMEOUT_MS = 10_000;

function config(): { url: string; key: string } {
  const url = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY 설정이 필요합니다.");
  return { url: url.replace(/\/+$/, ""), key };
}

function kstDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function dayUtcRange(day: string): { start: string; end: string } {
  const start = new Date(`${day}T00:00:00+09:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1_000);
  if (Number.isNaN(start.getTime())) throw new Error(`날짜 형식이 올바르지 않습니다: ${day}`);
  return { start: start.toISOString(), end: end.toISOString() };
}

async function fetchPages<T>(
  table: string,
  params: Record<string, string>,
): Promise<T[]> {
  const { url, key } = config();
  const rows: T[] = [];
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
    const query = new URLSearchParams({
      ...params,
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    const response = await fetch(`${url}/rest/v1/${table}?${query}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`${table} 조회 실패 HTTP ${response.status}: ${detail.slice(0, 200)}`);
    }
    const page = (await response.json()) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
  throw new Error(`${table} 조회가 ${MAX_ROWS}행 상한에 도달했습니다.`);
}

function inFilter(values: string[]): string {
  return `in.(${values.map((value) => value.replaceAll(",", "")).join(",")})`;
}

export async function collectDay(
  day: string,
  operator = resolveServerOperator(),
): Promise<CollectedDay> {
  const { start, end } = dayUtcRange(day);
  const sessionRows = await fetchPages<{ payload: PaperTradingSession }>(
    "paper_trading_sessions",
    {
      select: "payload",
      decision_provider: "eq.cli-agent",
      updated_at: `gte.${start}`,
      and: `(updated_at.lt.${end})`,
      order: "updated_at.asc",
    },
  );
  const sessions = sessionRows
    .map((row) => row.payload)
    .filter(
      (session) =>
        session.decisionProvider === "cli-agent" &&
        session.owner === operator &&
        kstDate(session.startedAt ?? session.createdAt) === day,
    );
  const sessionIds = sessions.map((session) => session.id);

  const ticks = sessionIds.length
    ? (
        await fetchPages<{ payload: PaperTradingTick }>("paper_trading_ticks", {
          select: "payload",
          session_id: inFilter(sessionIds),
          order: "session_id.asc,tick_index.asc",
        })
      ).map((row) => row.payload)
    : [];

  const labelRows = sessionIds.length
    ? await fetchPages<{
        tick_id: string;
        session_id: string;
        ticker: string;
        action: string;
        source: StoredTickLabel["source"];
        label: StoredTickLabel["label"];
        return_pct: number | string | null;
        payload: IntradayTickLabelPayload | null;
      }>("intraday_tick_labels", {
        select: "tick_id,session_id,ticker,action,source,label,return_pct,payload",
        session_id: inFilter(sessionIds),
        order: "session_id.asc,tick_id.asc",
      })
    : [];
  const labels: StoredTickLabel[] = labelRows.map((row) => ({
    tickId: row.tick_id,
    sessionId: row.session_id,
    ticker: row.ticker,
    action: row.action,
    source: row.source,
    label: row.label,
    returnPct: row.return_pct === null ? null : Number(row.return_pct),
    payload: row.payload,
  }));

  const runRows = await fetchPages<{ payload: AutopilotRun }>(
    "paper_trading_autopilot_runs",
    {
      select: "payload",
      owner: `eq.${operator}`,
      updated_at: `gte.${start}`,
      and: `(updated_at.lt.${end})`,
      order: "updated_at.asc",
    },
  );
  const runs = runRows
    .map((row) => row.payload)
    .filter((run) => run.owner === operator && kstDate(run.startedAt) === day);
  const runIds = runs.map((run) => run.id);
  const screenerSnapshots = runIds.length
    ? (
        await fetchPages<{ payload: AutopilotScreenerSnapshot }>(
          "paper_trading_autopilot_screener_snapshots",
          {
            select: "payload",
            run_id: inFilter(runIds),
            order: "created_at.asc",
          },
        )
      ).map((row) => row.payload)
    : [];

  return { date: day, operator, sessions, ticks, labels, runs, screenerSnapshots };
}

export function hashCollectedDay(day: CollectedDay): string {
  const stable = {
    date: day.date,
    operator: day.operator,
    sessions: day.sessions.map((item) => [item.id, item.updatedAt, item.status, item.portfolioValue]),
    ticks: day.ticks.map((item) => [item.id, item.status, item.returnPctAfter, item.orders]),
    labels: day.labels.map((item) => [item.tickId, item.label, item.returnPct]),
    runs: day.runs.map((item) => [item.id, item.status, item.updatedAt]),
    snapshots: day.screenerSnapshots.map((item) => item.id),
  };
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}
