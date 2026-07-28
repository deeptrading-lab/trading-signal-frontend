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
import type { HorizonStatus, ScorecardRegime } from "@/lib/types/scorecard/scorecard";
import type { OutcomeCandidate } from "@/lib/stock/decisionOutcome";
import type { TouchScanRow, TouchScanUpdate } from "@/lib/server/scorecard/touchScoring";
import type { AIAnalysisProvider, FinalVerdict } from "@/lib/types/stock/aiAnalysis";
import type { SignalAction } from "@/lib/types/signal";
import { createLogger } from "@/lib/server/logTag";
import { getSupabaseServiceConfig } from "@/lib/server/supabase/egressGuard";

const log = createLogger("scorecard-store");

const TABLE = "signal_scorecard";
const REL_COLS = (h: string): string =>
  `${h}_bench_return_pct,${h}_excess_return_pct,${h}_beta,${h}_alpha_residual_pct,${h}_regime`;

const SELECT_COLS =
  "id,ticker,provider,verdict,decision_confidence,signal_score,signal_action," +
  "target_pct,stop_loss_pct,entry_close,entry_date,live_price,decided_at,run_id,bench_key," +
  `d1_status,d1_close,d1_return_pct,d1_scored_at,${REL_COLS("d1")},` +
  `w1_status,w1_close,w1_return_pct,w1_scored_at,${REL_COLS("w1")},` +
  `w2_status,w2_close,w2_return_pct,w2_scored_at,${REL_COLS("w2")},` +
  `m1_status,m1_close,m1_return_pct,m1_scored_at,${REL_COLS("m1")},created_at`;

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
  bench_key: string | null;
  d1_status: HorizonStatus;
  d1_close: number | string | null;
  d1_return_pct: number | string | null;
  d1_scored_at: string | null;
  d1_bench_return_pct: number | string | null;
  d1_excess_return_pct: number | string | null;
  d1_beta: number | string | null;
  d1_alpha_residual_pct: number | string | null;
  d1_regime: ScorecardRegime | null;
  w1_status: HorizonStatus;
  w1_close: number | string | null;
  w1_return_pct: number | string | null;
  w1_scored_at: string | null;
  w1_bench_return_pct: number | string | null;
  w1_excess_return_pct: number | string | null;
  w1_beta: number | string | null;
  w1_alpha_residual_pct: number | string | null;
  w1_regime: ScorecardRegime | null;
  w2_status: HorizonStatus;
  w2_close: number | string | null;
  w2_return_pct: number | string | null;
  w2_scored_at: string | null;
  w2_bench_return_pct: number | string | null;
  w2_excess_return_pct: number | string | null;
  w2_beta: number | string | null;
  w2_alpha_residual_pct: number | string | null;
  w2_regime: ScorecardRegime | null;
  m1_status: HorizonStatus;
  m1_close: number | string | null;
  m1_return_pct: number | string | null;
  m1_scored_at: string | null;
  m1_bench_return_pct: number | string | null;
  m1_excess_return_pct: number | string | null;
  m1_beta: number | string | null;
  m1_alpha_residual_pct: number | string | null;
  m1_regime: ScorecardRegime | null;
  created_at: string;
};

function supabaseConfig(): { url: string; key: string } | null {
  return getSupabaseServiceConfig();
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
    benchKey: r.bench_key,
    d1Status: r.d1_status,
    d1Close: num(r.d1_close),
    d1ReturnPct: num(r.d1_return_pct),
    d1ScoredAt: r.d1_scored_at,
    d1BenchReturnPct: num(r.d1_bench_return_pct),
    d1ExcessReturnPct: num(r.d1_excess_return_pct),
    d1Beta: num(r.d1_beta),
    d1AlphaResidualPct: num(r.d1_alpha_residual_pct),
    d1Regime: r.d1_regime,
    w1Status: r.w1_status,
    w1Close: num(r.w1_close),
    w1ReturnPct: num(r.w1_return_pct),
    w1ScoredAt: r.w1_scored_at,
    w1BenchReturnPct: num(r.w1_bench_return_pct),
    w1ExcessReturnPct: num(r.w1_excess_return_pct),
    w1Beta: num(r.w1_beta),
    w1AlphaResidualPct: num(r.w1_alpha_residual_pct),
    w1Regime: r.w1_regime,
    w2Status: r.w2_status,
    w2Close: num(r.w2_close),
    w2ReturnPct: num(r.w2_return_pct),
    w2ScoredAt: r.w2_scored_at,
    w2BenchReturnPct: num(r.w2_bench_return_pct),
    w2ExcessReturnPct: num(r.w2_excess_return_pct),
    w2Beta: num(r.w2_beta),
    w2AlphaResidualPct: num(r.w2_alpha_residual_pct),
    w2Regime: r.w2_regime,
    m1Status: r.m1_status,
    m1Close: num(r.m1_close),
    m1ReturnPct: num(r.m1_return_pct),
    m1ScoredAt: r.m1_scored_at,
    m1BenchReturnPct: num(r.m1_bench_return_pct),
    m1ExcessReturnPct: num(r.m1_excess_return_pct),
    m1Beta: num(r.m1_beta),
    m1AlphaResidualPct: num(r.m1_alpha_residual_pct),
    m1Regime: r.m1_regime,
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
    bench_key: input.benchKey,
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
    "(d1_status.eq.pending,w1_status.eq.pending,w2_status.eq.pending,m1_status.eq.pending)",
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

/**
 * 시장/베타 보정 채점(v2) 대상 행 조회 — pending horizon **또는** backfill 필요(채점됐으나 상대
 * 측정값 비어있는) horizon 이 있는 행. PRD `scorecard-relative-scoring` §소급 재채점.
 *
 * backfill 판별: horizon 이 hit/miss/flat 인데 `${h}_bench_return_pct` 가 null.
 * - entry_date 오름차순(오래된 것 먼저) + limit. 미설정/오류 시 빈 배열(fail-soft).
 */
export async function getRowsNeedingRelativeScoring(limit: number): Promise<ScorecardRow[]> {
  const config = supabaseConfig();
  if (!config) return [];

  // pending(도래 미정) + 각 horizon 의 "채점됨 & bench null"(backfill) 을 OR 로 묶는다.
  const scoredNoBench = (h: string): string =>
    `and(${h}_status.in.(hit,miss,flat),${h}_bench_return_pct.is.null)`;
  const orClause =
    "(d1_status.eq.pending,w1_status.eq.pending,w2_status.eq.pending,m1_status.eq.pending," +
    `${scoredNoBench("d1")},${scoredNoBench("w1")},${scoredNoBench("w2")},${scoredNoBench("m1")})`;

  const url = new URL(`${config.url}/rest/v1/${TABLE}`);
  url.searchParams.set("select", SELECT_COLS);
  url.searchParams.set("or", orClause);
  url.searchParams.set("order", "entry_date.asc");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, {
    method: "GET",
    headers: { ...headers(config.key), Accept: "application/json" },
    cache: "no-store",
  }).catch((error: unknown) => {
    log.warn("상대채점 대상 조회 예외", error);
    return null;
  });

  if (!res) return [];
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    log.warn(`상대채점 대상 조회 실패 status=${res.status} ${text}`);
    return [];
  }

  const rows = (await res.json().catch(() => [])) as SupabaseScorecardRow[];
  return Array.isArray(rows) ? rows.map(toRow) : [];
}

/**
 * 채점 원장의 (ticker, entry_date) 키 집합 조회 — backfill 멱등 판별용
 * (PRD `scorecard-backfill-decisions`). 키 형식은 `${ticker}|${entry_date}`.
 *
 * ticker·entry_date 만 select 해 경량. 미설정/오류 시 빈 Set(fail-soft) — backfill 게이트가
 * 별도로 막으므로 빈 Set 이어도 잘못된 중복 insert 로 이어지지 않는다(insert 실패는 카운트만).
 */
export async function getScorecardKeys(limit = 5000): Promise<Set<string>> {
  const config = supabaseConfig();
  if (!config) return new Set();

  const url = new URL(`${config.url}/rest/v1/${TABLE}`);
  url.searchParams.set("select", "ticker,entry_date");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, {
    method: "GET",
    headers: { ...headers(config.key), Accept: "application/json" },
    cache: "no-store",
  }).catch((error: unknown) => {
    log.warn("키 조회 예외", error);
    return null;
  });

  if (!res) return new Set();
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    log.warn(`키 조회 실패 status=${res.status} ${text}`);
    return new Set();
  }

  const rows = (await res.json().catch(() => [])) as Array<{
    ticker: string;
    entry_date: string;
  }>;
  if (!Array.isArray(rows)) return new Set();
  return new Set(rows.map((r) => `${r.ticker}|${r.entry_date}`));
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
  w2: "w2",
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
  // 시장/베타 보정 측정값(scorecard-relative-scoring) — 제공된 필드만 PATCH(undefined 는 생략).
  if (update.benchReturnPct !== undefined) body[`${c}_bench_return_pct`] = update.benchReturnPct;
  if (update.excessReturnPct !== undefined) body[`${c}_excess_return_pct`] = update.excessReturnPct;
  if (update.beta !== undefined) body[`${c}_beta`] = update.beta;
  if (update.alphaResidualPct !== undefined) body[`${c}_alpha_residual_pct`] = update.alphaResidualPct;
  if (update.regime !== undefined) body[`${c}_regime`] = update.regime;
  // 벤치마크 키는 행 공통(종목 고정) — 갱신 시 동봉되면 행에도 반영(멱등).
  if (update.benchKey !== undefined) body["bench_key"] = update.benchKey;

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

/**
 * /analyze 카드 결과 표시용 — 지정 ticker 들의 채점 원장 행을 가볍게 조회한다.
 *
 * 카드에 "이 판단이 맞았나"를 붙이려면 판정별 horizon 상태가 필요한데, 집계용
 * `getAllScorecardRows`(2,000행·전 컬럼)는 목록 엔드포인트에 과하다. 배지에 필요한 컬럼만,
 * 해당 종목만, **시간 범위까지 좁혀서** 뽑는다.
 *
 * ⚠️ 이 엔드포인트는 30s(진행중 15s) 주기로 폴링되므로 상한 없는 조회는 Egress 를 계속 태운다
 * (`lib/server/supabase/egressGuard` 원칙). `sinceIso` 로 카드가 가리킬 수 있는 구간만 읽고,
 * 그 덕에 limit 로 **가장 오래된 카드(= m1 까지 성숙해 보여줄 값이 가장 큰 카드)** 가 조용히
 * 잘려나가던 문제도 사라진다.
 *
 * 매칭·표시 선택은 순수 로직(`lib/stock/decisionOutcome`)이 담당한다.
 * 실패·미설정은 fail-soft(빈 배열) — 결과 표시는 부가 정보라 목록을 막지 않는다.
 */
export async function getRecentOutcomeRows(
  tickers: string[],
  sinceIso: string,
  limit = 200,
): Promise<OutcomeCandidate[]> {
  const config = supabaseConfig();
  if (!config || tickers.length === 0) return [];

  const url = new URL(`${config.url}/rest/v1/${TABLE}`);
  url.searchParams.set(
    "select",
    "ticker,decided_at,run_id,d1_status,w1_status,w2_status,m1_status," +
      "d1_excess_return_pct,w1_excess_return_pct,w2_excess_return_pct,m1_excess_return_pct",
  );
  url.searchParams.set("ticker", `in.(${tickers.join(",")})`);
  url.searchParams.set("decided_at", `gte.${sinceIso}`);
  url.searchParams.set("order", "decided_at.desc");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, {
    method: "GET",
    headers: { ...headers(config.key), Accept: "application/json" },
    cache: "no-store",
  }).catch((error: unknown) => {
    // 조용한 실패 금지 — 결과가 안 보이는 원인을 로그로 남긴다.
    console.warn("[scorecard-store] 카드 결과 조회 네트워크 실패", error);
    return null;
  });
  if (!res?.ok) {
    if (res) console.warn(`[scorecard-store] 카드 결과 조회 실패 status=${res.status}`);
    return [];
  }

  const rows = (await res.json().catch(() => [])) as Array<Record<string, unknown>>;
  if (!Array.isArray(rows)) return [];

  // ⚠️ 모듈 상단 `num` 을 가리지 않도록 별도 이름 — PostgREST numeric 은 문자열로 올 수 있어
  //    숫자만 받으면 초과수익이 조용히 사라진다.
  const toNum = (v: unknown): number | null => {
    const n = typeof v === "string" ? Number(v) : v;
    return typeof n === "number" && Number.isFinite(n) ? n : null;
  };
  const st = (v: unknown): HorizonStatus => (typeof v === "string" ? (v as HorizonStatus) : "pending");

  return rows.map((r) => ({
    ticker: String(r.ticker),
    decidedAt: String(r.decided_at),
    runId: typeof r.run_id === "string" ? r.run_id : null,
    statuses: {
      d1: st(r.d1_status),
      w1: st(r.w1_status),
      w2: st(r.w2_status),
      m1: st(r.m1_status),
    },
    excess: {
      d1: toNum(r.d1_excess_return_pct),
      w1: toNum(r.w1_excess_return_pct),
      w2: toNum(r.w2_excess_return_pct),
      m1: toNum(r.m1_excess_return_pct),
    },
  }));
}

/**
 * phase-2 터치 스캔 대상 조회 — 커서가 없거나 오래된 행부터(nulls first 인덱스 정합).
 *
 * 창(TOUCH_SCAN_WINDOW_DAYS)이 끝난 행은 순수 로직(`isScanComplete`)이 걸러내므로 여기서는
 * entry_date 하한만 둔다(아주 오래된 원장을 매번 훑지 않도록). fail-soft — 실패 시 빈 배열.
 */
export async function getTouchScanRows(
  limit: number,
  entrySinceDash: string,
): Promise<TouchScanRow[]> {
  const config = supabaseConfig();
  if (!config) return [];

  const url = new URL(`${config.url}/rest/v1/${TABLE}`);
  url.searchParams.set(
    "select",
    "id,ticker,entry_date,live_price,target_pct,stop_loss_pct," +
      "target_price,stop_price,target_hit_date,stop_hit_date,touch_scanned_through",
  );
  url.searchParams.set("entry_date", `gte.${entrySinceDash}`);
  // 미스캔(nulls) 우선, 그 안에서는 **최신 판정 우선** — 활성 구간(창이 열려 있어 오늘도 터치가
  // 일어날 수 있는 판정)이 배치를 먼저 차지해야 한다. 오래된 행은 다음 회차에 처리된다.
  url.searchParams.set("order", "touch_scanned_through.asc.nullsfirst,entry_date.desc");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, {
    method: "GET",
    headers: { ...headers(config.key), Accept: "application/json" },
    cache: "no-store",
  }).catch((error: unknown) => {
    log.warn("터치 스캔 대상 조회 네트워크 실패", error);
    return null;
  });
  if (!res?.ok) {
    if (res) log.warn(`터치 스캔 대상 조회 실패 status=${res.status}`);
    return [];
  }

  const rows = (await res.json().catch(() => [])) as Array<Record<string, unknown>>;
  if (!Array.isArray(rows)) return [];

  return rows.map((r) => ({
    id: String(r.id),
    ticker: String(r.ticker),
    entryDate: String(r.entry_date),
    livePrice: num((r.live_price ?? null) as number | string | null),
    targetPct: num((r.target_pct ?? null) as number | string | null),
    stopLossPct: num((r.stop_loss_pct ?? null) as number | string | null),
    targetPrice: num((r.target_price ?? null) as number | string | null),
    stopPrice: num((r.stop_price ?? null) as number | string | null),
    targetHitDate: typeof r.target_hit_date === "string" ? r.target_hit_date : null,
    stopHitDate: typeof r.stop_hit_date === "string" ? r.stop_hit_date : null,
    touchScannedThrough:
      typeof r.touch_scanned_through === "string" ? r.touch_scanned_through : null,
  }));
}

/** 터치 스캔 결과 1행 부분 갱신(PATCH by id). 실패는 ok:false — 호출부가 카운트만 한다. */
export async function updateTouchScan(
  id: string,
  update: TouchScanUpdate,
): Promise<{ ok: boolean }> {
  const config = supabaseConfig();
  if (!config) return { ok: false };

  const body: Record<string, unknown> = {};
  if (update.touchScannedThrough !== undefined) {
    body.touch_scanned_through = update.touchScannedThrough;
  }
  if (update.targetPrice !== undefined) body.target_price = update.targetPrice;
  if (update.stopPrice !== undefined) body.stop_price = update.stopPrice;
  if (update.targetHitDate !== undefined) body.target_hit_date = update.targetHitDate;
  if (update.stopHitDate !== undefined) body.stop_hit_date = update.stopHitDate;
  if (Object.keys(body).length === 0) return { ok: true }; // 쓸 것이 없으면 호출 자체를 생략.

  const url = new URL(`${config.url}/rest/v1/${TABLE}`);
  url.searchParams.set("id", `eq.${id}`);

  const res = await fetch(url, {
    method: "PATCH",
    headers: { ...headers(config.key), Prefer: "return=minimal" },
    body: JSON.stringify(body),
  }).catch((error: unknown) => {
    log.warn("터치 스캔 갱신 네트워크 실패", error);
    return null;
  });
  if (!res?.ok) {
    if (res) log.warn(`터치 스캔 갱신 실패 status=${res.status}`);
    return { ok: false };
  }
  return { ok: true };
}
