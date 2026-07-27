/**
 * AI 분석 최종 결론 공유 저장소 — Supabase REST 기반 서버 전용 유틸.
 *
 * MVP 정책:
 * - ticker 별 최신 Portfolio Manager 결론 1건만 저장한다(history 없음).
 * - Supabase 미설정/오류는 분석을 막지 않는다. 조회는 null, 저장은 skipped/error 로 fail-soft.
 * - service role key 는 서버 route handler 에서만 사용하며 브라우저로 노출하지 않는다.
 */

import type {
  AIAnalysisDecisionSnapshot,
  AIAnalysisProvider,
  DecisionSignal,
  FinalDecision,
  SentimentReport,
} from "@/lib/types/stock/aiAnalysis";
import type {
  AIDecisionListItem,
  AIDecisionTokens,
} from "@/lib/types/stock/aiAnalysisDecisions";
import { getSupabaseServiceConfig } from "@/lib/server/supabase/egressGuard";

type SupabaseDecisionRow = {
  ticker: string;
  name: string | null;
  provider: AIAnalysisProvider;
  decision: FinalDecision;
  sentiment: SentimentReport | null;
  signal: DecisionSignal | null;
  updated_at: string;
};

/** 조회 select 컬럼 — name 포함(legacy 행은 null). */
const SELECT_COLS = "ticker,name,provider,decision,sentiment,signal,updated_at";
const CARD_LIST_RPC = "get_ai_decision_card_summaries";
const CARD_LIST_LIMIT = 20;
const CARD_SELECT_COLS =
  "ticker,name,provider,updated_at," +
  "verdict:decision->>verdict,time_horizon:decision->>time_horizon," +
  "limited_data:decision->limitedData,bars:decision->bars,signal_score:signal->score";

type SupabaseDecisionCardRow = {
  ticker: string;
  name: string | null;
  provider: AIAnalysisProvider;
  updated_at: string;
  verdict: AIDecisionListItem["decision"]["verdict"];
  time_horizon: AIDecisionListItem["decision"]["time_horizon"];
  limited_data: boolean | null;
  bars: number | null;
  signal_score: number | string | null;
  run_id?: string | null;
  total_input_tokens?: number | string | null;
  total_output_tokens?: number | string | null;
  total_cost_usd?: number | string | null;
  measured?: boolean | null;
};

export type AIDecisionCardSummary = Omit<AIDecisionListItem, "reanalysis">;

export type DecisionStoreWriteResult =
  | { ok: true; skipped: false }
  | { ok: true; skipped: true; reason: "not_configured" }
  | { ok: false; skipped: false; error: string };

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

function toSnapshot(row: SupabaseDecisionRow): AIAnalysisDecisionSnapshot {
  return {
    ticker: row.ticker,
    name: row.name ?? null,
    provider: row.provider,
    decision: row.decision,
    sentiment: row.sentiment ?? null,
    signal: row.signal ?? null,
    updatedAt: row.updated_at,
  };
}

function nullableNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toCardSummary(row: SupabaseDecisionCardRow): AIDecisionCardSummary {
  const tokens: AIDecisionTokens | null = row.run_id
    ? {
        runId: row.run_id,
        totalInputTokens: nullableNumber(row.total_input_tokens),
        totalOutputTokens: nullableNumber(row.total_output_tokens),
        totalCostUsd: nullableNumber(row.total_cost_usd),
        measured: row.measured ?? false,
      }
    : null;
  const signalScore = nullableNumber(row.signal_score);
  return {
    ticker: row.ticker,
    name: row.name ?? null,
    provider: row.provider,
    decision: {
      verdict: row.verdict,
      time_horizon: row.time_horizon,
      limitedData: row.limited_data ?? false,
      bars: row.bars ?? 0,
    },
    signal: signalScore == null ? null : { score: signalScore },
    updatedAt: row.updated_at,
    tokens,
  };
}

export function isAIDecisionStoreConfigured(): boolean {
  return supabaseConfig() !== null;
}

export async function getLatestAIDecision(
  ticker: string,
): Promise<AIAnalysisDecisionSnapshot | null> {
  const config = supabaseConfig();
  if (!config) return null;

  const url = new URL(`${config.url}/rest/v1/ai_analysis_decisions`);
  url.searchParams.set("ticker", `eq.${ticker}`);
  url.searchParams.set("select", SELECT_COLS);
  url.searchParams.set("limit", "1");

  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...headers(config.key),
      Accept: "application/json",
    },
    cache: "no-store",
  }).catch((error: unknown) => {
    console.warn(`[ai-decision-store] 조회 예외 ticker=${ticker}`, error);
    return null;
  });

  if (!res) return null;

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn(`[ai-decision-store] 조회 실패 ticker=${ticker} status=${res.status} ${text}`);
    return null;
  }

  const rows = await res.json().catch(() => []) as SupabaseDecisionRow[];
  const row = Array.isArray(rows) ? rows[0] : undefined;
  return row ? toSnapshot(row) : null;
}

/**
 * 저장된 모든 종목의 최신 결론을 updated_at 내림차순으로 조회한다(분석 결과 카드 목록용).
 * ai_analysis_decisions 는 ticker PK upsert 라 종목당 1행 → 그대로 "최신순 분석 종목 목록"이 된다.
 * 미설정/오류 시 빈 배열(fail-soft) — 카드 화면이 빈 상태로 graceful 하게 떨어진다.
 */
export async function getAllAIDecisions(
  limit = 200,
): Promise<AIAnalysisDecisionSnapshot[]> {
  const config = supabaseConfig();
  if (!config) return [];

  const url = new URL(`${config.url}/rest/v1/ai_analysis_decisions`);
  url.searchParams.set("select", SELECT_COLS);
  url.searchParams.set("order", "updated_at.desc");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...headers(config.key),
      Accept: "application/json",
    },
    cache: "no-store",
  }).catch((error: unknown) => {
    console.warn("[ai-decision-store] 목록 조회 예외", error);
    return null;
  });

  if (!res) return [];

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn(`[ai-decision-store] 목록 조회 실패 status=${res.status} ${text}`);
    return [];
  }

  const rows = (await res.json().catch(() => [])) as SupabaseDecisionRow[];
  return Array.isArray(rows) ? rows.map(toSnapshot) : [];
}

/**
 * 분석 결과 목록 카드 전용 경량 조회.
 *
 * 1순위: DB 함수가 최신 run 토큰을 DB 안에서 집계해 최신 20건 요약만 반환한다.
 * 2순위: 함수 미적용/일시 오류 시에도 decision JSON 전체나 usage 1,000행으로 되돌아가지 않고,
 *        PostgREST JSON 필드 projection으로 같은 20건을 토큰 없이 반환한다.
 */
export async function getAIDecisionCardSummaries(
  limit = CARD_LIST_LIMIT,
): Promise<AIDecisionCardSummary[]> {
  const config = supabaseConfig();
  if (!config) return [];
  const safeLimit = Math.max(1, Math.min(Math.trunc(limit), CARD_LIST_LIMIT));

  const rpcUrl = new URL(`${config.url}/rest/v1/rpc/${CARD_LIST_RPC}`);
  rpcUrl.searchParams.set("p_limit", String(safeLimit));
  const rpcRes = await fetch(rpcUrl, {
    method: "GET",
    headers: { ...headers(config.key), Accept: "application/json" },
    cache: "no-store",
  }).catch(() => null);

  if (rpcRes?.ok) {
    const rows = (await rpcRes.json().catch(() => [])) as SupabaseDecisionCardRow[];
    return Array.isArray(rows) ? rows.map(toCardSummary) : [];
  }
  if (rpcRes) {
    console.warn(
      `[ai-decision-store] 카드 요약 RPC 실패 status=${rpcRes.status} — 저용량 projection 폴백`,
    );
  }

  const fallbackUrl = new URL(`${config.url}/rest/v1/ai_analysis_decisions`);
  fallbackUrl.searchParams.set("select", CARD_SELECT_COLS);
  fallbackUrl.searchParams.set("order", "updated_at.desc");
  fallbackUrl.searchParams.set("limit", String(safeLimit));
  const fallbackRes = await fetch(fallbackUrl, {
    method: "GET",
    headers: { ...headers(config.key), Accept: "application/json" },
    cache: "no-store",
  }).catch(() => null);
  if (!fallbackRes?.ok) {
    if (fallbackRes) {
      console.warn(`[ai-decision-store] 카드 projection 실패 status=${fallbackRes.status}`);
    }
    return [];
  }
  const rows = (await fallbackRes.json().catch(() => [])) as SupabaseDecisionCardRow[];
  return Array.isArray(rows) ? rows.map(toCardSummary) : [];
}

/**
 * 백필용(decision-stock-name) — ticker 행의 종목명만 부분 갱신. 다른 컬럼은 건드리지 않는다.
 * name 빈 값/미설정/오류는 no-op(false 반환, fail-soft). 멱등 — 이미 채워진 행에 다시 써도 무방.
 */
export async function setDecisionName(
  ticker: string,
  name: string | null,
): Promise<boolean> {
  if (!name) return false;
  const config = supabaseConfig();
  if (!config) return false;

  const url = new URL(`${config.url}/rest/v1/ai_analysis_decisions`);
  url.searchParams.set("ticker", `eq.${ticker}`);

  const res = await fetch(url, {
    method: "PATCH",
    headers: { ...headers(config.key), Prefer: "return=minimal" },
    body: JSON.stringify({ name }),
  }).catch(() => null);

  return res != null && res.ok;
}

export async function upsertAIDecision(input: {
  ticker: string;
  /** 분석 시점 종목명(정제 완료, ticker 동일/빈 값이면 null 권장). 컬럼 미적용 DB 면 무시됨(fail-soft). */
  name?: string | null;
  provider: AIAnalysisProvider;
  decision: FinalDecision;
  sentiment: SentimentReport | null;
  signal: DecisionSignal | null;
}): Promise<DecisionStoreWriteResult> {
  const config = supabaseConfig();
  if (!config) return { ok: true, skipped: true, reason: "not_configured" };

  const payload: Record<string, unknown> = {
    ticker: input.ticker,
    provider: input.provider,
    decision: input.decision,
    sentiment: input.sentiment,
    signal: input.signal,
    updated_at: new Date().toISOString(),
  };
  // 종목명은 확보됐을 때만 기록한다. merge-duplicates upsert 는 body 에 없는 컬럼을 기존값으로
  //   보존하므로, 재분석 중 시세 조회가 실패해(name 미확보) 키를 생략하면 백필/이전 종목명이 유지된다.
  if (input.name) payload.name = input.name;

  const res = await fetch(`${config.url}/rest/v1/ai_analysis_decisions`, {
    method: "POST",
    headers: {
      ...headers(config.key),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(payload),
  }).catch((error: unknown) => ({
    ok: false,
    status: 0,
    text: async () => error instanceof Error ? error.message : String(error),
  }));

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      ok: false,
      skipped: false,
      error: `Supabase upsert 실패 status=${res.status} ${text}`,
    };
  }

  return { ok: true, skipped: false };
}

/**
 * 저장된 AI 분석 결과 삭제(레거시 정리 등) — ticker PK 로 1행 삭제. Supabase 미설정이면 skipped.
 * ⚠️ 파괴적 — 라우트에서 superadmin 가드(requireSuperadminApi) 필수.
 */
export async function deleteAIDecision(ticker: string): Promise<DecisionStoreWriteResult> {
  const config = supabaseConfig();
  if (!config) return { ok: true, skipped: true, reason: "not_configured" };

  const url = new URL(`${config.url}/rest/v1/ai_analysis_decisions`);
  url.searchParams.set("ticker", `eq.${ticker}`);

  const res = await fetch(url, {
    method: "DELETE",
    headers: { ...headers(config.key), Prefer: "return=minimal" },
  }).catch((error: unknown) => ({
    ok: false,
    status: 0,
    text: async () => (error instanceof Error ? error.message : String(error)),
  }));

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, skipped: false, error: `Supabase delete 실패 status=${res.status} ${text}` };
  }

  return { ok: true, skipped: false };
}
