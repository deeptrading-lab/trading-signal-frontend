/**
 * prod 분석 요청 큐 저장소 — Supabase REST(service role) 기반 서버 전용 유틸.
 *
 * PRD analysis-request-queue §3-3. `decisionStore.ts`·`agentUsageStore.ts` 와 **동일한**
 * service role REST 연결·fail-soft 패턴을 따른다(미설정/오류는 throw 대신 no-op/빈 결과).
 *
 * 흐름:
 * - enqueue BFF 가 `enqueueAnalysis` 로 pending 1행 적재(중복 가드 내장).
 * - 로컬 워커가 폴링으로 `recoverStuck` → `claimNextPending` → 처리 → `markDone`/`markFailed`.
 *
 * ⚠️ service role key 는 서버(BFF·워커)에서만 사용하며 브라우저로 노출하지 않는다.
 * ⚠️ ai_analysis_queue 테이블 미생성 시 모든 함수가 fail-soft(빈 결과/no-op) — 분석 흐름 무회귀.
 */

import { createLogger } from "@/lib/server/logTag";
import type {
  AnalysisJobSource,
  AnalysisQueueRow,
  AnalysisQueueStatus,
  EnqueueResult,
} from "@/lib/types/stock/analysisQueue";

/** `[analysis-queue]` 콘솔 로그 — 앞에 `HH:MM:SS.mmm(KST)` 시각 프리픽스 부착. */
const queueLog = createLogger("analysis-queue");

const TABLE = "ai_analysis_queue";
const SELECT_COLS =
  "id,ticker,name,status,force,source,worker_id,error,requested_by,created_at,claimed_at,finished_at";

/**
 * stuck 복구 시 pending 재투입 횟수를 추적하는 마커(PRD §9 q2 — 1회 재투입 후 2회째 failed).
 * 별도 컬럼을 추가하지 않고 error 텍스트에 `[recovered:N]` 를 누적해 카운트한다(스키마 최소 변경).
 */
const RECOVER_MARKER_RE = /\[recovered:(\d+)\]/;

type SupabaseQueueRow = {
  id: number;
  ticker: string;
  name: string | null;
  status: AnalysisQueueStatus;
  force: boolean;
  source: AnalysisJobSource | null;
  worker_id: string | null;
  error: string | null;
  requested_by: string | null;
  created_at: string;
  claimed_at: string | null;
  finished_at: string | null;
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

function toRow(row: SupabaseQueueRow): AnalysisQueueRow {
  return {
    id: row.id,
    ticker: row.ticker,
    name: row.name ?? null,
    status: row.status,
    force: row.force,
    source: row.source ?? "prod",
    workerId: row.worker_id,
    error: row.error,
    requestedBy: row.requested_by,
    createdAt: row.created_at,
    claimedAt: row.claimed_at,
    finishedAt: row.finished_at,
  };
}

/** 분석 큐 store(Supabase service role)가 설정돼 있는지. */
export function isAnalysisQueueStoreConfigured(): boolean {
  return supabaseConfig() !== null;
}

/** error 마커에서 누적 재투입 횟수 파싱(없으면 0). */
function recoverCountOf(error: string | null): number {
  if (!error) return 0;
  const m = error.match(RECOVER_MARKER_RE);
  return m ? Number(m[1]) : 0;
}

/**
 * 같은 ticker 가 pending/processing(활성) 상태인 row 1건을 반환(없으면 null).
 * 중복 가드(enqueue)·UI 처리 중 판정에 쓴다. 미설정/오류 시 null(fail-soft).
 */
export async function findActiveByTicker(
  ticker: string,
): Promise<AnalysisQueueRow | null> {
  const config = supabaseConfig();
  if (!config) return null;

  const url = new URL(`${config.url}/rest/v1/${TABLE}`);
  url.searchParams.set("select", SELECT_COLS);
  url.searchParams.set("ticker", `eq.${ticker}`);
  // PostgREST `in` 필터 — pending 또는 processing.
  url.searchParams.set("status", "in.(pending,processing)");
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", "1");

  const res = await fetch(url, {
    method: "GET",
    headers: { ...headers(config.key), Accept: "application/json" },
    cache: "no-store",
  }).catch((error: unknown) => {
    queueLog.warn(`활성 조회 예외 ticker=${ticker}`, error);
    return null;
  });

  if (!res) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    queueLog.warn(`활성 조회 실패 ticker=${ticker} status=${res.status} ${text}`);
    return null;
  }

  const rows = (await res.json().catch(() => [])) as SupabaseQueueRow[];
  const row = Array.isArray(rows) ? rows[0] : undefined;
  return row ? toRow(row) : null;
}

/**
 * 분석 요청을 큐에 적재한다. **중복 가드 내장** — 같은 ticker 가 이미 pending/processing 이면
 * INSERT 하지 않고 `{ status:'already' }` 반환(PRD G5/AC-4). 신규면 pending 1행 INSERT.
 * 미설정 시 `not_configured`, 오류 시 `error`(둘 다 throw 하지 않음 — fail-soft).
 */
export async function enqueueAnalysis(input: {
  ticker: string;
  force?: boolean;
  /** 분석 시점 종목명(decision-stock-name) — pending 카드도 즉시 종목명 표시용. 없으면 생략(컬럼 default null). */
  name?: string | null;
  /** 작업 출처(prod/local/bot). 미지정 시 컬럼 default 'prod'. */
  source?: AnalysisJobSource;
}): Promise<EnqueueResult> {
  const config = supabaseConfig();
  if (!config) return { status: "not_configured" };

  // 중복 가드 — 활성 row 가 있으면 INSERT 안 함.
  const active = await findActiveByTicker(input.ticker);
  if (active) return { status: "already", id: active.id };

  const insertBody: Record<string, unknown> = {
    ticker: input.ticker,
    status: "pending",
    force: input.force ?? false,
  };
  // 종목명은 확보됐을 때만 적재 — 불필요한 null payload 를 피한다(미확보면 컬럼 default null).
  if (input.name) insertBody.name = input.name;
  // 출처 지정 시 태깅(봇 등). 미지정이면 컬럼 default 'prod'.
  if (input.source) insertBody.source = input.source;

  const res = await fetch(`${config.url}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: {
      ...headers(config.key),
      // 삽입된 row 를 돌려받아 id 를 응답에 싣는다.
      Prefer: "return=representation",
    },
    body: JSON.stringify(insertBody),
  }).catch((error: unknown) => ({
    ok: false,
    status: 0,
    text: async () => (error instanceof Error ? error.message : String(error)),
    json: async () => [],
  }));

  if (!res.ok) {
    const text = await ("text" in res ? res.text() : Promise.resolve("")).catch(() => "");
    return { status: "error", error: `enqueue 실패 status=${res.status} ${text}` };
  }

  const rows = (await ("json" in res ? res.json() : Promise.resolve([])).catch(() => [])) as SupabaseQueueRow[];
  const id = Array.isArray(rows) && rows[0] ? rows[0].id : null;
  return { status: "queued", id };
}

/**
 * 직접 실행(로컬/봇) 작업 1행을 `processing` 으로 insert 하고 id 반환(없으면 null).
 * `source` 컬럼 미적용 DB 면 insert 실패 → null(인플라이트 미표시, 분석은 정상 진행 — fail-soft).
 */
async function insertProcessingRow(input: {
  ticker: string;
  source: AnalysisJobSource;
  workerId?: string;
}): Promise<number | null> {
  const config = supabaseConfig();
  if (!config) return null;

  const res = await fetch(`${config.url}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: { ...headers(config.key), Prefer: "return=representation" },
    body: JSON.stringify({
      ticker: input.ticker,
      status: "processing",
      source: input.source,
      worker_id: input.workerId ?? null,
      claimed_at: new Date().toISOString(),
    }),
  }).catch((error: unknown) => ({
    ok: false,
    status: 0,
    text: async () => (error instanceof Error ? error.message : String(error)),
    json: async () => [],
  }));

  if (!res.ok) {
    const text = await ("text" in res ? res.text() : Promise.resolve("")).catch(() => "");
    queueLog.warn(`processing insert 실패 ticker=${input.ticker} status=${res.status} ${text}`);
    return null;
  }
  const rows = (await ("json" in res ? res.json() : Promise.resolve([])).catch(() => [])) as SupabaseQueueRow[];
  return Array.isArray(rows) && rows[0] ? rows[0].id : null;
}

/**
 * 분석 실행 시작을 queue 에 기록한다(unified-analysis-jobs §3-2/§3-3). 핸들러가 슬롯 획득 직후 호출.
 *
 * - `jobId` 가 주어지면(prod 워커가 이미 claim 한 행) 그 행을 **재사용**하고 핸들러는 종결하지 않는다
 *   (`owned=false` → 워커가 markDone/markFailed). 추가 DB 쓰기 없음.
 * - `jobId` 가 없으면(로컬/봇 직접 실행) 같은 ticker active 행이 있으면 재사용(pending 은 processing 으로 전이),
 *   없으면 신규 `processing` 행 insert. 핸들러가 종결(`owned=true`).
 *
 * 미설정/오류/컬럼 미적용 시 `{ jobId:null, owned:false }`(fail-soft — 분석 정상 진행, 인플라이트만 미표시).
 */
export async function startProcessing(input: {
  ticker: string;
  source: AnalysisJobSource;
  /** prod 워커가 claim 한 행 id. 있으면 핸들러는 종결 안 함(owned=false). */
  jobId?: number | null;
  workerId?: string;
}): Promise<{ jobId: number | null; owned: boolean }> {
  // prod 워커 경로 — 이미 claim 된 행 재사용, 종결은 워커가(중복 행·이중 종결 방지, G4).
  if (input.jobId != null) return { jobId: input.jobId, owned: false };

  // 직접 실행(로컬/봇) — 같은 ticker active 행 재사용 or 신규 insert. 종결은 핸들러가(owned=true).
  const active = await findActiveByTicker(input.ticker);
  if (active) {
    if (active.status === "pending") {
      await patchById(active.id, {
        status: "processing",
        claimed_at: new Date().toISOString(),
      });
    }
    return { jobId: active.id, owned: true };
  }
  const id = await insertProcessingRow({
    ticker: input.ticker,
    source: input.source,
    workerId: input.workerId,
  });
  return { jobId: id, owned: id != null };
}

/**
 * 활성(pending/processing) 작업 전체를 최신순(created_at desc)으로 반환한다(/analyze 인플라이트 합성용).
 * 미설정/오류/컬럼 미적용 시 빈 배열(fail-soft) — 완료 결과 카드는 그대로 뜨고 인플라이트만 미표시.
 */
export async function getActiveJobs(limit = 200): Promise<AnalysisQueueRow[]> {
  const config = supabaseConfig();
  if (!config) return [];

  const url = new URL(`${config.url}/rest/v1/${TABLE}`);
  url.searchParams.set("select", SELECT_COLS);
  url.searchParams.set("status", "in.(pending,processing)");
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, {
    method: "GET",
    headers: { ...headers(config.key), Accept: "application/json" },
    cache: "no-store",
  }).catch((error: unknown) => {
    queueLog.warn("활성 작업 조회 예외", error);
    return null;
  });

  if (!res) return [];
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    queueLog.warn(`활성 작업 조회 실패 status=${res.status} ${text}`);
    return [];
  }
  const rows = (await res.json().catch(() => [])) as SupabaseQueueRow[];
  return Array.isArray(rows) ? rows.map(toRow) : [];
}

/**
 * 가장 오래된 pending row 1건을 processing 으로 전이하고 반환한다(없으면 null).
 *
 * v1 은 단일 워커 전제(PRD A3)라 select-then-update 로 단순화한다. 경합 최소화를 위해
 * UPDATE 의 WHERE 에 `status=eq.pending` 을 함께 걸어, 다른 워커가 먼저 가져간 row 면
 * 0행 반영(빈 결과) → 그 사이클은 그냥 다음 폴링으로 넘어간다.
 *
 * 미설정/오류/없음 시 null(fail-soft).
 */
export async function claimNextPending(
  workerId: string,
): Promise<AnalysisQueueRow | null> {
  const config = supabaseConfig();
  if (!config) return null;

  // 1) 가장 오래된 pending 1건 조회(FIFO).
  const findUrl = new URL(`${config.url}/rest/v1/${TABLE}`);
  findUrl.searchParams.set("select", "id");
  findUrl.searchParams.set("status", "eq.pending");
  findUrl.searchParams.set("order", "created_at.asc");
  findUrl.searchParams.set("limit", "1");

  const findRes = await fetch(findUrl, {
    method: "GET",
    headers: { ...headers(config.key), Accept: "application/json" },
    cache: "no-store",
  }).catch((error: unknown) => {
    queueLog.warn("pending 조회 예외", error);
    return null;
  });

  if (!findRes) return null;
  if (!findRes.ok) {
    const text = await findRes.text().catch(() => "");
    queueLog.warn(`pending 조회 실패 status=${findRes.status} ${text}`);
    return null;
  }

  const found = (await findRes.json().catch(() => [])) as { id: number }[];
  const target = Array.isArray(found) ? found[0] : undefined;
  if (!target) return null;

  // 2) 조건부 UPDATE — 여전히 pending 일 때만 processing 으로 전이(경합 가드).
  const updUrl = new URL(`${config.url}/rest/v1/${TABLE}`);
  updUrl.searchParams.set("id", `eq.${target.id}`);
  updUrl.searchParams.set("status", "eq.pending");

  const updRes = await fetch(updUrl, {
    method: "PATCH",
    headers: { ...headers(config.key), Prefer: "return=representation" },
    body: JSON.stringify({
      status: "processing",
      worker_id: workerId,
      claimed_at: new Date().toISOString(),
    }),
  }).catch((error: unknown) => ({
    ok: false,
    status: 0,
    text: async () => (error instanceof Error ? error.message : String(error)),
    json: async () => [],
  }));

  if (!updRes.ok) {
    const text = await ("text" in updRes ? updRes.text() : Promise.resolve("")).catch(() => "");
    queueLog.warn(`claim 전이 실패 id=${target.id} status=${updRes.status} ${text}`);
    return null;
  }

  const rows = (await ("json" in updRes ? updRes.json() : Promise.resolve([])).catch(() => [])) as SupabaseQueueRow[];
  const row = Array.isArray(rows) ? rows[0] : undefined;
  // 0행 = 그 사이 다른 워커가 가져감 → null(다음 폴링).
  return row ? toRow(row) : null;
}

/**
 * 진행중 작업 행에 종목명을 기록한다(decision-stock-name). 분석 핸들러가 KIS 종목명 확보 시 호출 →
 * /analyze 진행중 카드가 종목번호 대신 종목명을 즉시 표시(깜빡임 제거). name 이 빈 값이면 no-op,
 * 컬럼 미적용 DB·오류는 patchById 가 흡수(fail-soft — 분석/큐 흐름 무회귀).
 */
export async function setJobName(id: number, name: string | null): Promise<void> {
  if (!name) return;
  await patchById(id, { name });
}

/** row 를 done 으로 종결(finished_at 세팅). 미설정/오류 시 no-op(fail-soft). */
export async function markDone(id: number): Promise<void> {
  await patchById(id, {
    status: "done",
    finished_at: new Date().toISOString(),
    error: null,
  });
}

/** row 를 failed 로 종결(error·finished_at 세팅). 미설정/오류 시 no-op(fail-soft). */
export async function markFailed(id: number, error: string): Promise<void> {
  await patchById(id, {
    status: "failed",
    finished_at: new Date().toISOString(),
    error: error.slice(0, 500),
  });
}

/** id 로 row 부분 갱신 — 공통 PATCH 헬퍼. 미설정/오류는 흡수(fail-soft). */
async function patchById(
  id: number,
  patch: Record<string, unknown>,
): Promise<void> {
  const config = supabaseConfig();
  if (!config) return;

  const url = new URL(`${config.url}/rest/v1/${TABLE}`);
  url.searchParams.set("id", `eq.${id}`);

  const res = await fetch(url, {
    method: "PATCH",
    headers: { ...headers(config.key), Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  }).catch((error: unknown) => ({
    ok: false,
    status: 0,
    text: async () => (error instanceof Error ? error.message : String(error)),
  }));

  if (!res.ok) {
    const text = await ("text" in res ? res.text() : Promise.resolve("")).catch(() => "");
    queueLog.warn(`row 갱신 실패 id=${id} status=${res.status} ${text}`);
  }
}

/**
 * processing 에 `timeoutMs` 초과 잔류한(워커가 죽은) row 를 복구한다(PRD AC-10/§9 q2).
 *
 * 정책: **pending 재투입 1회**, 2회째도 stuck 이면 **failed 종결**(무한 루프 방지).
 *   재투입 횟수는 error 텍스트의 `[recovered:N]` 마커로 추적한다.
 *
 * @returns 이번 사이클에 복구(pending 재투입)되거나 failed 종결된 row 수.
 * 미설정/오류 시 0(fail-soft).
 */
export async function recoverStuck(timeoutMs: number): Promise<number> {
  const config = supabaseConfig();
  if (!config) return 0;

  const cutoff = new Date(Date.now() - timeoutMs).toISOString();

  // claimed_at 이 cutoff 이전인 processing row 들을 조회.
  const url = new URL(`${config.url}/rest/v1/${TABLE}`);
  url.searchParams.set("select", "id,error,claimed_at");
  url.searchParams.set("status", "eq.processing");
  url.searchParams.set("claimed_at", `lt.${cutoff}`);
  url.searchParams.set("limit", "50");

  const res = await fetch(url, {
    method: "GET",
    headers: { ...headers(config.key), Accept: "application/json" },
    cache: "no-store",
  }).catch((error: unknown) => {
    queueLog.warn("stuck 조회 예외", error);
    return null;
  });

  if (!res) return 0;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    queueLog.warn(`stuck 조회 실패 status=${res.status} ${text}`);
    return 0;
  }

  const rows = (await res.json().catch(() => [])) as {
    id: number;
    error: string | null;
    claimed_at: string | null;
  }[];
  if (!Array.isArray(rows) || rows.length === 0) return 0;

  let recovered = 0;
  for (const row of rows) {
    const prevCount = recoverCountOf(row.error);
    if (prevCount >= 1) {
      // 이미 1회 재투입했는데 또 stuck → failed 종결(무한 루프 방지).
      await markFailed(
        row.id,
        `처리가 반복적으로 멈춰 실패 처리했어요. [recovered:${prevCount}]`,
      );
      queueLog.warn(`stuck 재발 → failed 종결 id=${row.id} (recovered=${prevCount})`);
    } else {
      // 첫 stuck → pending 재투입 + 마커 1.
      await patchById(row.id, {
        status: "pending",
        worker_id: null,
        claimed_at: null,
        error: "[recovered:1]",
      });
      queueLog.warn(`stuck → pending 재투입 id=${row.id}`);
    }
    recovered += 1;
  }
  return recovered;
}

/** 현재 pending row 수(하트비트 value 에 실어 보냄). 미설정/오류 시 0(fail-soft). */
export async function getQueueDepth(): Promise<number> {
  const config = supabaseConfig();
  if (!config) return 0;

  const url = new URL(`${config.url}/rest/v1/${TABLE}`);
  url.searchParams.set("select", "id");
  url.searchParams.set("status", "eq.pending");

  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...headers(config.key),
      Accept: "application/json",
      // 정확한 count 를 헤더로 받되, body 도 함께 받아 폴백 카운트 가능.
      Prefer: "count=exact",
    },
    cache: "no-store",
  }).catch((error: unknown) => {
    queueLog.warn("큐 깊이 조회 예외", error);
    return null;
  });

  if (!res) return 0;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    queueLog.warn(`큐 깊이 조회 실패 status=${res.status} ${text}`);
    return 0;
  }

  // Content-Range: `0-24/25` 형태에서 total 파싱 → 없으면 body 길이로 폴백.
  const range = res.headers.get("content-range");
  const total = range?.split("/")?.[1];
  if (total && total !== "*") {
    const n = Number(total);
    if (Number.isFinite(n)) return n;
  }
  const rows = (await res.json().catch(() => [])) as unknown[];
  return Array.isArray(rows) ? rows.length : 0;
}
