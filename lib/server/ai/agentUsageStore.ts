/**
 * AI 분석 에이전트별 토큰 사용량 이력 저장소 — Supabase REST 기반 서버 전용 유틸.
 *
 * 정책:
 * - ai_analysis_decisions(upsert)와 달리 매 agent 호출 1행씩 append 한다(history).
 * - Supabase 미설정/오류는 분석을 막지 않는다. insert=skipped/error, 조회=null 로 fail-soft.
 * - service role key 는 서버에서만 사용하며 브라우저로 노출하지 않는다.
 */

import type {
  AgentKey,
  AgentUsage,
  AIAnalysisProvider,
} from "@/lib/types/stock/aiAnalysis";
import { createLogger } from "@/lib/server/logTag";

/** `[ai-usage-store]` 콘솔 로그 — 앞에 `HH:MM:SS.mmm(KST)` 시각 프리픽스 부착. */
const usageLog = createLogger("ai-usage-store");

export type UsageStage = "A" | "B" | "C";

export interface AgentUsageInsert {
  runId: string;
  ticker: string;
  agentKey: AgentKey;
  stage: UsageStage;
  round: number | null;
  provider: AIAnalysisProvider;
  usage: AgentUsage;
  /** usage.model 보다 우선하는 명시 모델(설정값 등). 없으면 usage.model 사용 */
  model?: string | null;
  durationMs?: number | null;
}

/** Supabase row 를 camelCase 로 변환한 조회 결과. */
export interface AgentUsageRecord {
  runId: string;
  ticker: string;
  agentKey: AgentKey;
  stage: UsageStage;
  round: number | null;
  provider: AIAnalysisProvider;
  model: string | null;
  measured: boolean;
  inputTokens: number | null;
  outputTokens: number | null;
  cacheCreationInputTokens: number | null;
  cacheReadInputTokens: number | null;
  costUsd: number | null;
  createdAt: string;
}

export type UsageStoreWriteResult =
  | { ok: true; skipped: false }
  | { ok: true; skipped: true; reason: "not_configured" }
  | { ok: false; skipped: false; error: string };

const TABLE = "ai_agent_usage";
const SELECT_COLS =
  "run_id,ticker,agent_key,stage,round,provider,model,measured," +
  "input_tokens,output_tokens,cache_creation_input_tokens,cache_read_input_tokens,cost_usd,created_at";

type SupabaseUsageRow = {
  run_id: string;
  ticker: string;
  agent_key: AgentKey;
  stage: UsageStage;
  round: number | null;
  provider: AIAnalysisProvider;
  model: string | null;
  measured: boolean;
  input_tokens: number | null;
  output_tokens: number | null;
  cache_creation_input_tokens: number | null;
  cache_read_input_tokens: number | null;
  cost_usd: number | null;
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

function toRecord(row: SupabaseUsageRow): AgentUsageRecord {
  return {
    runId: row.run_id,
    ticker: row.ticker,
    agentKey: row.agent_key,
    stage: row.stage,
    round: row.round,
    provider: row.provider,
    model: row.model,
    measured: row.measured,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    cacheCreationInputTokens: row.cache_creation_input_tokens,
    cacheReadInputTokens: row.cache_read_input_tokens,
    costUsd: row.cost_usd,
    createdAt: row.created_at,
  };
}

export function isAgentUsageStoreConfigured(): boolean {
  return supabaseConfig() !== null;
}

/** 토큰 사용량 1행 append. 분석 스트림을 막지 않도록 호출부에서 await 없이 fire-and-forget 가능. */
export async function insertAgentUsage(
  input: AgentUsageInsert,
): Promise<UsageStoreWriteResult> {
  const config = supabaseConfig();
  if (!config) return { ok: true, skipped: true, reason: "not_configured" };

  const { usage } = input;
  const body = {
    run_id: input.runId,
    ticker: input.ticker,
    agent_key: input.agentKey,
    stage: input.stage,
    round: input.round,
    provider: input.provider,
    model: input.model ?? usage.model,
    measured: usage.measured,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    cache_creation_input_tokens: usage.cacheCreationInputTokens,
    cache_read_input_tokens: usage.cacheReadInputTokens,
    cost_usd: usage.costUsd,
    duration_ms: input.durationMs ?? null,
  };

  const res = await fetch(`${config.url}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: {
      ...headers(config.key),
      Prefer: "return=minimal",
    },
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
      error: `Supabase usage insert 실패 status=${res.status} ${text}`,
    };
  }
  return { ok: true, skipped: false };
}

/** await 없이 호출해도 미처리 거부가 없도록 감싼 헬퍼. 실패는 warn 로그만. */
export function recordAgentUsage(input: AgentUsageInsert): void {
  void insertAgentUsage(input)
    .then((r) => {
      if (!r.ok) usageLog.warn(`insert 실패 — ${r.error}`);
    })
    .catch((e: unknown) => usageLog.warn("insert 예외", e));
}

/** 최신순 토큰 이력 조회(집계용 raw). 미설정/오류 시 null. */
export async function getAgentUsageRows(
  limit = 1000,
): Promise<AgentUsageRecord[] | null> {
  const config = supabaseConfig();
  if (!config) return null;

  const url = new URL(`${config.url}/rest/v1/${TABLE}`);
  url.searchParams.set("select", SELECT_COLS);
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, {
    method: "GET",
    headers: { ...headers(config.key), Accept: "application/json" },
    cache: "no-store",
  }).catch((error: unknown) => {
    usageLog.warn("조회 예외", error);
    return null;
  });

  if (!res) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    usageLog.warn(`조회 실패 status=${res.status} ${text}`);
    return null;
  }

  const rows = (await res.json().catch(() => [])) as SupabaseUsageRow[];
  return Array.isArray(rows) ? rows.map(toRecord) : [];
}
