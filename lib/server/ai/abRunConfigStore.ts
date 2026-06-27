/**
 * A/B 하니스 run config 태깅 저장소 — Supabase REST 기반 서버 전용 유틸.
 *
 * 정책(agentUsageStore 와 동일):
 * - 한 분석 run(run_id) = 1행 insert. run_id PK 라 같은 run 재태깅은 멱등(409 무시 가능).
 * - Supabase 미설정/오류는 분석을 막지 않는다(fail-soft). insert=skipped/error, 조회=null.
 * - service role key 는 서버에서만 사용.
 */

import type { AnalysisConfigOverride } from "@/lib/server/ai/analysisConfig";
import { createLogger } from "@/lib/server/logTag";

const abLog = createLogger("ab-run-config");

const TABLE = "ab_run_config";
const SELECT_COLS = "run_id,session,config_id,config_label,ticker,params_json,created_at";

export interface AbRunConfigInsert {
  runId: string;
  session: string;
  configId: string;
  configLabel?: string | null;
  ticker?: string | null;
  /** 사용한 override(없으면 기본 config = null). */
  params?: AnalysisConfigOverride | null;
}

export interface AbRunConfigRecord {
  runId: string;
  session: string;
  configId: string;
  configLabel: string | null;
  ticker: string | null;
  params: AnalysisConfigOverride | null;
  createdAt: string;
}

type SupabaseAbRow = {
  run_id: string;
  session: string;
  config_id: string;
  config_label: string | null;
  ticker: string | null;
  params_json: AnalysisConfigOverride | null;
  created_at: string;
};

export type AbConfigWriteResult =
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

function toRecord(row: SupabaseAbRow): AbRunConfigRecord {
  return {
    runId: row.run_id,
    session: row.session,
    configId: row.config_id,
    configLabel: row.config_label,
    ticker: row.ticker,
    params: row.params_json,
    createdAt: row.created_at,
  };
}

export function isAbRunConfigStoreConfigured(): boolean {
  return supabaseConfig() !== null;
}

/** run config 1행 append. 분석 스트림을 막지 않도록 호출부에서 await 없이 호출 가능. */
export async function insertAbRunConfig(
  input: AbRunConfigInsert,
): Promise<AbConfigWriteResult> {
  const config = supabaseConfig();
  if (!config) return { ok: true, skipped: true, reason: "not_configured" };

  const body = {
    run_id: input.runId,
    session: input.session,
    config_id: input.configId,
    config_label: input.configLabel ?? null,
    ticker: input.ticker ?? null,
    params_json: input.params ?? null,
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
    return { ok: false, skipped: false, error: `ab_run_config insert 실패 status=${res.status} ${text}` };
  }
  return { ok: true, skipped: false };
}

/** await 없이 호출해도 미처리 거부가 없도록 감싼 헬퍼. 실패는 warn 로그만. */
export function recordAbRunConfig(input: AbRunConfigInsert): void {
  void insertAbRunConfig(input)
    .then((r) => {
      if (!r.ok) abLog.warn(`insert 실패 — ${r.error}`);
    })
    .catch((e: unknown) => abLog.warn("insert 예외", e));
}

/** 한 A/B 실험 배치(session)의 run config 목록. 미설정/오류 시 null. */
export async function getAbRunConfigsBySession(
  session: string,
  limit = 1000,
): Promise<AbRunConfigRecord[] | null> {
  const config = supabaseConfig();
  if (!config) return null;

  const url = new URL(`${config.url}/rest/v1/${TABLE}`);
  url.searchParams.set("select", SELECT_COLS);
  url.searchParams.set("session", `eq.${session}`);
  url.searchParams.set("order", "created_at.asc");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, {
    method: "GET",
    headers: { ...headers(config.key), Accept: "application/json" },
    cache: "no-store",
  }).catch((error: unknown) => {
    abLog.warn("조회 예외", error);
    return null;
  });

  if (!res) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    abLog.warn(`조회 실패 status=${res.status} ${text}`);
    return null;
  }

  const rows = (await res.json().catch(() => [])) as SupabaseAbRow[];
  return Array.isArray(rows) ? rows.map(toRecord) : [];
}
