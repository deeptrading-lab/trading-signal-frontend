/**
 * `swing_judgments` Supabase REST 저장소(서버 전용). SQL = `docs/sql/swing-judgments.sql`.
 *
 * - 쓰기: upsert(merge-duplicates) — 같은 (거래일, 종목, 규칙서 버전)은 덮어쓴다(같은 입력이면 같은 행).
 * - 읽기: 필요한 열만 select(Egress 최소화). 미설정·오류는 fail-soft(빈 결과/에러 문자열).
 */

import { getSupabaseServiceConfig } from "@/lib/server/supabase/egressGuard";
import type { SwingScreenerItem } from "@/lib/types/swing/api";
import type { SwingJudgmentRow } from "./row";

const TABLE = "swing_judgments";

export const SWING_LIST_COLUMNS =
  "ticker,market,grade,met_count,flow_pass,exclusions,items,stage,close,adv20,plan_stop,plan_target,plan_rr,flow";

function headers(key: string): HeadersInit {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

export function isSwingStoreConfigured(): boolean {
  return getSupabaseServiceConfig() !== null;
}

/** 행 묶음 upsert. 성공 시 null, 실패 시 에러 문자열. */
export async function upsertSwingRows(rows: SwingJudgmentRow[]): Promise<string | null> {
  const config = getSupabaseServiceConfig();
  if (!config) return "supabase-not-configured";
  if (rows.length === 0) return null;
  const res = await fetch(`${config.url}/rest/v1/${TABLE}?on_conflict=trade_date,ticker,rulebook_version`, {
    method: "POST",
    headers: { ...headers(config.key), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  }).catch((e: unknown) => ({ ok: false, status: 0, text: async () => String(e) }));
  if (res.ok) return null;
  return `swing upsert 실패 status=${res.status} ${await res.text().catch(() => "")}`.slice(0, 300);
}

async function get<T>(query: string): Promise<T[] | null> {
  const config = getSupabaseServiceConfig();
  if (!config) return null;
  const res = await fetch(`${config.url}/rest/v1/${TABLE}?${query}`, {
    headers: headers(config.key),
    cache: "no-store",
  }).catch(() => null);
  if (!res || !res.ok) return null;
  return (await res.json()) as T[];
}

/** 규칙서 버전의 가장 최근 저장 거래일. 없으면 null. */
export async function latestSwingTradeDate(version: string): Promise<string | null> {
  const rows = await get<{ trade_date: string }>(
    `select=trade_date&rulebook_version=eq.${encodeURIComponent(version)}&source=eq.screener&order=trade_date.desc&limit=1`,
  );
  return rows?.[0]?.trade_date ?? null;
}

export type SwingListFilter = "flow" | "excluded" | "all";
export type SwingListRow = Pick<
  SwingJudgmentRow,
  "ticker" | "market" | "grade" | "met_count" | "flow_pass" | "exclusions" | "items" | "stage" | "close" | "adv20" | "plan_stop" | "plan_target" | "plan_rr" | "flow"
>;

/** 스크리너 목록 — 거래대금(ADV20) 내림차순, 같으면 종목코드(안정 정렬). */
export async function listSwingRows(opts: {
  tradeDate: string;
  version: string;
  filter: SwingListFilter;
  market: "KOSPI" | "KOSDAQ" | null;
  limit: number;
  /** met = 충족 많은 순(동률은 거래대금 순). 기본 거래대금 순. */
  sort?: "adv" | "met";
}): Promise<SwingListRow[] | null> {
  const q = [
    `select=${SWING_LIST_COLUMNS}`,
    `trade_date=eq.${opts.tradeDate}`,
    `rulebook_version=eq.${encodeURIComponent(opts.version)}`,
    `source=eq.screener`,
    opts.filter === "flow" ? "flow_pass=is.true" : opts.filter === "excluded" ? "grade=eq.excluded" : null,
    opts.market ? `market=eq.${opts.market}` : null,
    opts.sort === "met" ? "order=met_count.desc,adv20.desc.nullslast,ticker.asc" : "order=adv20.desc.nullslast,ticker.asc",
    `limit=${opts.limit}`,
  ]
    .filter(Boolean)
    .join("&");
  return get<SwingListRow>(q);
}

/** 목록 행 → 화면 아이템(목록 API·종목 카드 축약 응답 공용). */
export function toSwingScreenerItem(r: SwingListRow, name: string): SwingScreenerItem {
  return {
    ticker: r.ticker,
    name,
    market: r.market,
    grade: r.grade,
    metCount: r.met_count,
    flowPass: r.flow_pass,
    exclusions: r.exclusions,
    items: r.items,
    stage: r.stage,
    close: Number(r.close),
    adv20: r.adv20 === null ? null : Number(r.adv20),
    planStop: r.plan_stop === null ? null : Number(r.plan_stop),
    planTarget: r.plan_target === null ? null : Number(r.plan_target),
    planRr: r.plan_rr === null ? null : Number(r.plan_rr),
    flow: r.flow ?? null,
  };
}

/** (거래일, 종목, 버전) 저장된 목록 행 1개 — 즉시 계산이 안 될 때(야간 점검) 축약 표시용. */
export async function getSwingListRow(tradeDate: string, ticker: string, version: string): Promise<SwingListRow | null> {
  const rows = await get<SwingListRow>(
    `select=${SWING_LIST_COLUMNS}&trade_date=eq.${tradeDate}&ticker=eq.${encodeURIComponent(ticker)}&rulebook_version=eq.${encodeURIComponent(version)}&limit=1`,
  );
  return rows?.[0] ?? null;
}

/** 행 수만 센다(PostgREST count=exact, 본문 없음). 실패면 null. */
async function count(query: string): Promise<number | null> {
  const config = getSupabaseServiceConfig();
  if (!config) return null;
  const res = await fetch(`${config.url}/rest/v1/${TABLE}?${query}`, {
    method: "HEAD",
    headers: { ...headers(config.key), Prefer: "count=exact" },
    cache: "no-store",
  }).catch(() => null);
  const total = res?.ok ? res.headers.get("content-range")?.split("/")[1] : undefined;
  return total && /^\d+$/.test(total) ? Number(total) : null;
}

/** 목록 상단 요약 — 저장 종목 수·수급 조건 충족·주의 종목 수. 하나라도 실패하면 null. */
export async function countSwingRows(opts: {
  tradeDate: string;
  version: string;
  market: "KOSPI" | "KOSDAQ" | null;
}): Promise<{ all: number; flow: number; excluded: number } | null> {
  const base = [
    `trade_date=eq.${opts.tradeDate}`,
    `rulebook_version=eq.${encodeURIComponent(opts.version)}`,
    "source=eq.screener",
    opts.market ? `market=eq.${opts.market}` : null,
  ]
    .filter(Boolean)
    .join("&");
  const [all, flow, excluded] = await Promise.all([
    count(base),
    count(`${base}&flow_pass=is.true`),
    count(`${base}&grade=eq.excluded`),
  ]);
  return all === null || flow === null || excluded === null ? null : { all, flow, excluded };
}

/** (거래일, 종목, 버전) 저장 행의 해시·등급 — 즉시 판정과의 일치 확인용. */
export async function getStoredSwingRow(
  tradeDate: string,
  ticker: string,
  version: string,
): Promise<{ input_hash: string; grade: string } | null> {
  const rows = await get<{ input_hash: string; grade: string }>(
    `select=input_hash,grade&trade_date=eq.${tradeDate}&ticker=eq.${ticker}&rulebook_version=eq.${encodeURIComponent(version)}&limit=1`,
  );
  return rows?.[0] ?? null;
}
