/**
 * 채점 원장(signal_scorecard) 저장소 — Supabase REST 기반 **서버 전용** 유틸.
 *
 * PRD `signal-scorecard` §3-1 / §8.1.
 * - insert(append) — 결정 1건 = 1행. 같은 ticker 재분석은 새 행(upsert 아님 — D1).
 * - read — horizon 중 하나라도 pending 인 행(cron 대상) · 채점 완료 행(집계용).
 * - update — horizon 별 status/close/return_pct/scored_at 부분 갱신(cron).
 *
 * 정책:
 * - Supabase 미설정/오류는 분석·cron 을 막지 않는다(fail-soft). insert=skipped/error,
 *   조회=빈 배열/null, 갱신=error.
 * - service role key 는 서버에서만 사용하며 브라우저로 노출하지 않는다.
 */

import type {
  HorizonScoreUpdate,
  ScorecardConfidence,
  ScorecardHorizon,
  ScorecardInsert,
  ScorecardRow,
  ScorecardWriteResult,
} from "@/lib/types/scorecard/scorecard";
import type { HorizonStatus } from "@/lib/types/scorecard/scorecard";
import type { AIAnalysisProvider, FinalVerdict } from "@/lib/types/stock/aiAnalysis";
import type { SignalAction } from "@/lib/types/signal";
import { createLogger } from "@/lib/server/logTag";

const log = createLogger("scorecard-store");

const TABLE = "signal_scorecard";
const SELECT_COLS =
  "id,ticker,provider,verdict,decision_confidence,signal_score,signal_action," +
  "target_pct,stop_loss_pct,entry_close,entry_date,live_price,decided_at,run_id," +
  "d1_status,d1_close,d1_return_pct,d1_scored_at," +
  "w1_status,w1_close,w1_return_pct,w1_scored_at," +
  "m1_status,m1_close,m1_return_pct,m1_scored_at,created_at";

type SupabaseScorecardRow = {
  id: string;
  ticker: string;
  provider: AIAnalysisProvider;
  verdict: FinalVerdict;
  decision_confidence: ScorecardConfidence;
  signal_score: number | string | null;
  signal_action: SignalAction | null;
  target_pct: number | string | null;
  stop_loss_pct: number | string | null;
  entry_close: number | string;
  entry_date: string;
  live_price: number | string | null;
  decided_at: string;
  run_id: string | null;
  d1_status: HorizonStatus;
  d1_close: number | string | null;
  d1_return_pct: number | string | null;
  d1_scored_at: string | null;
  w1_status: HorizonStatus;
  w1_close: number | string | null;
  w1_return_pct: number | string | null;
  w1_scored_at: string | null;
  m1_status: HorizonStatus;
  m1_close: number | string | null;
  m1_return_pct: number | string | null;
  m1_scored_at: string | null;
  created_at: string;
};

function supabaseConfig(): { url: string; key: string } | null {
  const url = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

function headers(key: string): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

/** numeric 컬럼은 Supabase REST 가 문자열로 반환할 수 있어 안전 변환. */
function num(v: number | string | null): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toRow(r: SupabaseScorecardRow): ScorecardRow {
  return {
    id: r.id,
    ticker: r.ticker,
    provider: r.provider,
    verdict: r.verdict,
    decisionConfidence: r.decision_confidence,
    signalScore: num(r.signal_score),
    signalAction: r.signal_action,
    targetPct: num(r.target_pct),
    stopLossPct: num(r.stop_loss_pct),
    entryClose: num(r.entry_close) ?? 0,
    entryDate: r.entry_date,
    livePrice: num(r.live_price),
    decidedAt: r.decided_at,
    runId: r.run_id,
    d1Status: r.d1_status,
    d1Close: num(r.d1_close),
    d1ReturnPct: num(r.d1_return_pct),
    d1ScoredAt: r.d1_scored_at,
    w1Status: r.w1_status,
    w1Close: num(r.w1_close),
    w1ReturnPct: num(r.w1_return_pct),
    w1ScoredAt: r.w1_scored_at,
    m1Status: r.m1_status,
    m1Close: num(r.m1_close),
    m1ReturnPct: num(r.m1_return_pct),
    m1ScoredAt: r.m1_scored_at,
    createdAt: r.created_at,
  };
}

export function isScorecardStoreConfigured(): boolean {
  return supabaseConfig() !== null;
}

/**
 * 채점 원장 1행 append. 분석 route.ts 에서 PM final 직후 호출(fail-soft — 분석 스트림을 막지 않음).
 */
export async function insertScorecardRow(
  input: ScorecardInsert,
): Promise<ScorecardWriteResult> {
  const config = supabaseConfig();
  if (!config) return { ok: true, skipped: true, reason: "not_configured" };

  const body = {
    ticker: input.ticker,
    provider: input.provider,
    verdict: input.verdict,
    decision_confidence: input.decisionConfidence,
    signal_score: input.signalScore,
    signal_action: input.signalAction,
    target_pct: input.targetPct,
    stop_loss_pct: input.stopLossPct,
    entry_close: input.entryClose,
    entry_date: input.entryDate,
    live_price: input.livePrice,
    decided_at: input.decidedAt,
    run_id: input.runId,
  };

  const res = await fetch(`${config.url}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: { ...headers(config.key), Prefer: "return=minimal" },
    body: JSON.stringify(body),
  }).catch((error: unknown) => ({
    ok: false,
    status: 0,
    text: async () => (error instanceof Error ? error.message : String(error)),
  }));

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      ok: false,
      skipped: false,
      error: `Supabase scorecard insert 실패 status=${res.status} ${text}`,
    };
  }
  return { ok: true, skipped: false };
}

/**
 * horizon 중 하나라도 pending 인 행을 조회(채점 cron 대상).
 * - entry_date 오름차순(오래된 결정 먼저 채점) + limit 배치.
 * - 미설정/오류 시 빈 배열(fail-soft) — cron 은 채점 0건으로 떨어진다.
 */
export async function getPendingScorecardRows(limit: number): Promise<ScorecardRow[]> {
  const config = supabaseConfig();
  if (!config) return [];

  const url = new URL(`${config.url}/rest/v1/${TABLE}`);
  url.searchParams.set("select", SELECT_COLS);
  url.searchParams.set(
    "or",
    "(d1_status.eq.pending,w1_status.eq.pending,m1_status.eq.pending)",
  );
  url.searchParams.set("order", "entry_date.asc");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, {
    method: "GET",
    headers: { ...headers(config.key), Accept: "application/json" },
    cache: "no-store",
  }).catch((error: unknown) => {
    log.warn("pending 조회 예외", error);
    return null;
  });

  if (!res) return [];
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    log.warn(`pending 조회 실패 status=${res.status} ${text}`);
    return [];
  }

  const rows = (await res.json().catch(() => [])) as SupabaseScorecardRow[];
  return Array.isArray(rows) ? rows.map(toRow) : [];
}

/** 집계(summary) 용 전체 행 조회. decided_at 내림차순 + limit. 미설정/오류 시 빈 배열. */
export async function getAllScorecardRows(limit = 2000): Promise<ScorecardRow[]> {
  const config = supabaseConfig();
  if (!config) return [];

  const url = new URL(`${config.url}/rest/v1/${TABLE}`);
  url.searchParams.set("select", SELECT_COLS);
  url.searchParams.set("order", "decided_at.desc");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, {
    method: "GET",
    headers: { ...headers(config.key), Accept: "application/json" },
    cache: "no-store",
  }).catch((error: unknown) => {
    log.warn("전체 조회 예외", error);
    return null;
  });

  if (!res) return [];
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    log.warn(`전체 조회 실패 status=${res.status} ${text}`);
    return [];
  }

  const rows = (await res.json().catch(() => [])) as SupabaseScorecardRow[];
  return Array.isArray(rows) ? rows.map(toRow) : [];
}

/** horizon → 컬럼 prefix 매핑. */
const HORIZON_COL: Record<ScorecardHorizon, string> = {
  d1: "d1",
  w1: "w1",
  m1: "m1",
};

/**
 * 단일 행의 한 horizon 평가 결과를 부분 갱신(PATCH).
 * id 로 1행만 조준 → 멱등(결정론). 미설정/오류는 error 반환(cron 이 그 ticker 만 skip).
 */
export async function updateHorizonScore(
  id: string,
  horizon: ScorecardHorizon,
  update: HorizonScoreUpdate,
): Promise<ScorecardWriteResult> {
  const config = supabaseConfig();
  if (!config) return { ok: true, skipped: true, reason: "not_configured" };

  const c = HORIZON_COL[horizon];
  const body: Record<string, unknown> = {
    [`${c}_status`]: update.status,
    [`${c}_close`]: update.close,
    [`${c}_return_pct`]: update.returnPct,
    [`${c}_scored_at`]: update.scoredAt,
  };

  const url = new URL(`${config.url}/rest/v1/${TABLE}`);
  url.searchParams.set("id", `eq.${id}`);

  const res = await fetch(url, {
    method: "PATCH",
    headers: { ...headers(config.key), Prefer: "return=minimal" },
    body: JSON.stringify(body),
  }).catch((error: unknown) => ({
    ok: false,
    status: 0,
    text: async () => (error instanceof Error ? error.message : String(error)),
  }));

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      ok: false,
      skipped: false,
      error: `Supabase scorecard update 실패 id=${id} horizon=${horizon} status=${res.status} ${text}`,
    };
  }
  return { ok: true, skipped: false };
}
