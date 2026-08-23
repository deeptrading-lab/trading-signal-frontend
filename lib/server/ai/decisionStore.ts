/**
 * AI 분석 최종 결론 공유 저장소 — Supabase REST 기반 서버 전용 유틸.
 *
 * MVP 정책:
 * - **(ticker, requested_by) 별** 최신 Portfolio Manager 결론 1건만 저장한다(history 없음).
 *   계정마다 자기 카드를 남기고, 같은 계정이 재분석하면 그 계정 행만 덮어쓴다(analyze-owner-cards).
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
import type { ThesisBreachInput } from "@/lib/stock/thesisBreach";
import { getSupabaseServiceConfig } from "@/lib/server/supabase/egressGuard";

type SupabaseDecisionRow = {
  ticker: string;
  name: string | null;
  provider: AIAnalysisProvider;
  decision: FinalDecision;
  sentiment: SentimentReport | null;
  signal: DecisionSignal | null;
  requested_by: string | null;
  updated_at: string;
};

/** 조회 select 컬럼 — name 포함(legacy 행은 null). */
const SELECT_COLS =
  "ticker,name,provider,decision,sentiment,signal,requested_by,updated_at";

/**
 * 세션 없이(미로그인·로컬 dev) 저장된 분석의 소유자. PK 컬럼이라 null 을 못 써서 빈 문자열을 쓴다.
 * **로그인 계정에는 노출되지 않는다** — 미로그인 화면에서만 보인다(아래 노출 규칙 참조).
 * 마이그레이션 이전 legacy 행은 여기가 아니라 실제 계정 이메일로 백필된다(docs/sql).
 */
export const NO_SESSION_OWNER = "";

/**
 * 미로그인 화면에 기본 노출할 데모 종목. 로그인 전 "맛보기" 용도 — 소유자와 무관하게 종목당 최신 1건.
 * env 손잡이 대신 코드 상수(운영 부담↓) — 바꾸려면 이 배열만 고친다.
 */
export const DEMO_TICKERS = ["005930", "000660", "035420"] as const;

/** 세션 이메일 → 소유자 키(PK 일부). 미로그인이면 세션 없음 버킷. */
export function ownerKey(email: string | null | undefined): string {
  return email ?? NO_SESSION_OWNER;
}
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
    requestedBy: row.requested_by ?? NO_SESSION_OWNER,
    updatedAt: row.updated_at,
  };
}

/**
 * 뷰어 스코프를 PostgREST 쿼리에 적용한다 — SQL 함수 `get_ai_decision_card_summaries` 의 where 와 동일 정책.
 *   · 로그인   → 내 계정 행만.
 *   · 미로그인 → 세션 없음 버킷(`""`) + 데모 종목.
 * 이메일에 `,`·`"` 는 들어올 수 없지만(정규화 이메일), 값은 큰따옴표로 감싸 `.` 구분자 오인을 막는다.
 */
function applyViewerScope(url: URL, viewer: string | null): void {
  if (viewer) {
    url.searchParams.set("requested_by", `eq.${viewer}`);
    return;
  }
  url.searchParams.set(
    "or",
    `(requested_by.eq."${NO_SESSION_OWNER}",ticker.in.(${DEMO_TICKERS.join(",")}))`,
  );
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

/**
 * ticker 의 "내가 볼 수 있는" 최신 결론 1건. 복합 PK 라 한 종목에 계정 수만큼 행이 있을 수 있어
 * 목록 카드와 **같은 뷰어 스코프**로 고른다(카드와 상세가 어긋나지 않게).
 */
export async function getLatestAIDecision(
  ticker: string,
  requestedBy: string | null = null,
): Promise<AIAnalysisDecisionSnapshot | null> {
  const config = supabaseConfig();
  if (!config) return null;

  const url = new URL(`${config.url}/rest/v1/ai_analysis_decisions`);
  url.searchParams.set("ticker", `eq.${ticker}`);
  url.searchParams.set("select", SELECT_COLS);
  applyViewerScope(url, requestedBy);
  url.searchParams.set("order", "updated_at.desc");
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
 * (ticker, requested_by) PK upsert 라 종목·계정당 1행 → 그대로 "최신순 분석 목록"이 된다.
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
  requestedBy: string | null = null,
): Promise<AIDecisionCardSummary[]> {
  const config = supabaseConfig();
  if (!config) return [];
  const safeLimit = Math.max(1, Math.min(Math.trunc(limit), CARD_LIST_LIMIT));

  const rpcUrl = new URL(`${config.url}/rest/v1/rpc/${CARD_LIST_RPC}`);
  rpcUrl.searchParams.set("p_limit", String(safeLimit));
  if (requestedBy) {
    rpcUrl.searchParams.set("p_requested_by", requestedBy);
  } else {
    // 미로그인 — 세션 없음 버킷 + 데모 종목만.
    rpcUrl.searchParams.set("p_demo_tickers", `{${DEMO_TICKERS.join(",")}}`);
  }
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
  applyViewerScope(fallbackUrl, requestedBy);
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
 * 테제 무효화 배지용 레벨 조회 — ticker 별 `verdict·base_price·target_pct·stop_loss_pct` 만.
 *
 * 카드 요약 projection 은 payload 를 줄이려 레벨 필드를 싣지 않는다(모바일 성능). 배지는 이 4개만
 * 있으면 되므로, 카드 RPC 를 바꿔 마이그레이션을 유발하는 대신 JSONB 필드만 뽑는 경량 조회를 둔다.
 * 실패는 fail-soft(빈 배열) — 배지는 부가 정보라 목록 자체를 막지 않는다.
 */
export async function getDecisionThesisLevels(
  tickers: string[],
  requestedBy: string | null = null,
): Promise<Map<string, ThesisBreachInput>> {
  const out = new Map<string, ThesisBreachInput>();
  const config = supabaseConfig();
  if (!config || tickers.length === 0) return out;

  const url = new URL(`${config.url}/rest/v1/ai_analysis_decisions`);
  url.searchParams.set(
    "select",
    "ticker,verdict:decision->>verdict,base_price:decision->base_price," +
      "target_pct:decision->target_pct,stop_loss_pct:decision->stop_loss_pct",
  );
  url.searchParams.set("ticker", `in.(${tickers.join(",")})`);
  // 목록 카드와 같은 뷰어 스코프 — 남의 행 레벨로 내 카드에 배지를 달지 않는다.
  applyViewerScope(url, requestedBy);
  url.searchParams.set("order", "updated_at.desc");

  const res = await fetch(url, {
    method: "GET",
    headers: { ...headers(config.key), Accept: "application/json" },
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) {
    if (res) console.warn(`[ai-decision-store] 판정 레벨 조회 실패 status=${res.status}`);
    return out;
  }

  const rows = (await res.json().catch(() => [])) as Array<{
    ticker: string;
    verdict: string | null;
    base_price: number | string | null;
    target_pct: number | string | null;
    stop_loss_pct: number | string | null;
  }>;
  if (!Array.isArray(rows)) return out;

  for (const row of rows) {
    const stop = nullableNumber(row.stop_loss_pct);
    if (!row.verdict || stop === null) continue; // 무효화 라인 없으면 배지 대상 아님.
    if (out.has(row.ticker)) continue; // updated_at desc 정렬 → 첫 등장이 최신(내 행 우선).
    out.set(row.ticker, {
      verdict: row.verdict as ThesisBreachInput["verdict"],
      base_price: nullableNumber(row.base_price),
      target_pct: nullableNumber(row.target_pct),
      stop_loss_pct: stop,
    });
  }
  return out;
}

/**
 * 백필용(decision-stock-name) — ticker 행의 종목명만 부분 갱신. 다른 컬럼은 건드리지 않는다.
 * name 빈 값/미설정/오류는 no-op(false 반환, fail-soft). 멱등 — 이미 채워진 행에 다시 써도 무방.
 */
export async function setDecisionName(
  ticker: string,
  requestedBy: string,
  name: string | null,
): Promise<boolean> {
  if (!name) return false;
  const config = supabaseConfig();
  if (!config) return false;

  const url = new URL(`${config.url}/rest/v1/ai_analysis_decisions`);
  url.searchParams.set("ticker", `eq.${ticker}`);
  url.searchParams.set("requested_by", `eq.${requestedBy}`);

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
  /** 분석을 요청한 계정(analyze-owner-cards). PK 일부라 항상 값이 있어야 한다(미로그인 = `""`). */
  requestedBy: string;
  /** 이 결론을 만든 분석 run — 카드 토큰 합계 귀속 키. 없으면 legacy 폴백(종목 최신 run). */
  runId?: string | null;
  provider: AIAnalysisProvider;
  decision: FinalDecision;
  sentiment: SentimentReport | null;
  signal: DecisionSignal | null;
}): Promise<DecisionStoreWriteResult> {
  const config = supabaseConfig();
  if (!config) return { ok: true, skipped: true, reason: "not_configured" };

  const payload: Record<string, unknown> = {
    ticker: input.ticker,
    // PK 일부 — 생략하면 공용 버킷('')에 덮어쓴다. 항상 명시한다.
    requested_by: input.requestedBy,
    provider: input.provider,
    decision: input.decision,
    sentiment: input.sentiment,
    signal: input.signal,
    updated_at: new Date().toISOString(),
  };
  // 종목명은 확보됐을 때만 기록한다. merge-duplicates upsert 는 body 에 없는 컬럼을 기존값으로
  //   보존하므로, 재분석 중 시세 조회가 실패해(name 미확보) 키를 생략하면 백필/이전 종목명이 유지된다.
  if (input.name) payload.name = input.name;
  if (input.runId) payload.run_id = input.runId;

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
 * 저장된 AI 분석 결과 삭제 — (ticker, requested_by) 복합 PK 로 **그 계정 행 1건만** 삭제한다.
 * 남의 계정 카드는 건드리지 않는다. Supabase 미설정이면 skipped.
 * ⚠️ 파괴적 — 라우트에서 superadmin 가드(requireSuperadminApi) 필수.
 */
export async function deleteAIDecision(
  ticker: string,
  requestedBy: string,
): Promise<DecisionStoreWriteResult> {
  const config = supabaseConfig();
  if (!config) return { ok: true, skipped: true, reason: "not_configured" };

  const url = new URL(`${config.url}/rest/v1/ai_analysis_decisions`);
  url.searchParams.set("ticker", `eq.${ticker}`);
  url.searchParams.set("requested_by", `eq.${requestedBy}`);

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
