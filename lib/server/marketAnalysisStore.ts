/**
 * 시황 분석(market_analyses) 시계열 저장소 — Supabase REST 기반 **서버 전용** 유틸.
 *
 * PRD `market-analysis` §3.2 / §4 AC-8.
 * - insert(append) — 생성 1건 = 1행(upsert 아님, 시계열 보존). Phase 4 cron 이 본격 적립.
 * - read — created_at 최신 1건(`?mode=latest` 저비용 조회·Phase 3 주입 원천).
 *
 * 정책:
 * - Supabase 미설정/오류는 분석을 막지 않는다(fail-soft). insert=skipped/error, 조회=null.
 * - service role key 는 서버 route handler 에서만 사용하며 브라우저로 노출하지 않는다.
 */

import { createLogger } from "@/lib/server/logTag";
import type { MarketAnalysis } from "@/lib/market/analysisTypes";
import type { MarketDataSource } from "@/lib/market/types";

const log = createLogger("market-analysis-store");
const TABLE = "market_analyses";

type SupabaseRow = {
  analysis: MarketAnalysis;
  data_source: MarketDataSource | null;
  created_at: string;
};

export type AnalysisStoreWriteResult =
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

export function isMarketAnalysisStoreConfigured(): boolean {
  return supabaseConfig() !== null;
}

export type LatestMarketAnalysis = {
  analysis: MarketAnalysis;
  /** 생성 시점 입력 스냅샷 출처(live/partial/mock) — 저비용 조회의 정직한 dataSource. */
  dataSource: MarketDataSource;
};

/**
 * 저장된 최신 시황 분석 1건(created_at desc) + 그 시점 dataSource. 미설정/오류/빈 결과는 null(fail-soft).
 */
export async function getLatestMarketAnalysis(): Promise<LatestMarketAnalysis | null> {
  const config = supabaseConfig();
  if (!config) return null;

  const url = new URL(`${config.url}/rest/v1/${TABLE}`);
  url.searchParams.set("select", "analysis,data_source,created_at");
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", "1");

  const res = await fetch(url, {
    method: "GET",
    headers: { ...headers(config.key), Accept: "application/json" },
    cache: "no-store",
  }).catch((error: unknown) => {
    log.warn("최신 조회 예외", error);
    return null;
  });

  if (!res) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    log.warn(`최신 조회 실패 status=${res.status} ${text}`);
    return null;
  }

  const rows = (await res.json().catch(() => [])) as SupabaseRow[];
  const row = Array.isArray(rows) ? rows[0] : undefined;
  if (!row?.analysis) return null;
  return { analysis: row.analysis, dataSource: row.data_source ?? "live" };
}

/**
 * 시황 분석 1건 append. 시계열 보존(upsert 아님). 미설정 시 skipped, 오류 시 error(fail-soft).
 */
export async function insertMarketAnalysis(
  analysis: MarketAnalysis,
  dataSource: MarketDataSource,
): Promise<AnalysisStoreWriteResult> {
  const config = supabaseConfig();
  if (!config) return { ok: true, skipped: true, reason: "not_configured" };

  const res = await fetch(`${config.url}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: { ...headers(config.key), Prefer: "return=minimal" },
    body: JSON.stringify({
      snapshot_as_of: analysis.snapshotAsOf,
      provider: analysis.provider,
      analysis,
      data_source: dataSource,
      created_at: analysis.asOf,
    }),
  }).catch((error: unknown) => ({
    ok: false,
    status: 0,
    text: async () => (error instanceof Error ? error.message : String(error)),
  }));

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, skipped: false, error: `Supabase insert 실패 status=${res.status} ${text}` };
  }

  return { ok: true, skipped: false };
}