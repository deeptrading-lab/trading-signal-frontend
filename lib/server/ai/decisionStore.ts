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

type SupabaseDecisionRow = {
  ticker: string;
  provider: AIAnalysisProvider;
  decision: FinalDecision;
  sentiment: SentimentReport | null;
  signal: DecisionSignal | null;
  updated_at: string;
};

export type DecisionStoreWriteResult =
  | { ok: true; skipped: false }
  | { ok: true; skipped: true; reason: "not_configured" }
  | { ok: false; skipped: false; error: string };

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

function toSnapshot(row: SupabaseDecisionRow): AIAnalysisDecisionSnapshot {
  return {
    ticker: row.ticker,
    provider: row.provider,
    decision: row.decision,
    sentiment: row.sentiment ?? null,
    signal: row.signal ?? null,
    updatedAt: row.updated_at,
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
  url.searchParams.set("select", "ticker,provider,decision,sentiment,signal,updated_at");
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
  url.searchParams.set("select", "ticker,provider,decision,sentiment,signal,updated_at");
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

export async function upsertAIDecision(input: {
  ticker: string;
  provider: AIAnalysisProvider;
  decision: FinalDecision;
  sentiment: SentimentReport | null;
  signal: DecisionSignal | null;
}): Promise<DecisionStoreWriteResult> {
  const config = supabaseConfig();
  if (!config) return { ok: true, skipped: true, reason: "not_configured" };

  const res = await fetch(`${config.url}/rest/v1/ai_analysis_decisions`, {
    method: "POST",
    headers: {
      ...headers(config.key),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      ticker: input.ticker,
      provider: input.provider,
      decision: input.decision,
      sentiment: input.sentiment,
      signal: input.signal,
      updated_at: new Date().toISOString(),
    }),
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
