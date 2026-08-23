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
import { HEARTBEAT_TTL_SEC, readWorkerHeartbeat } from "@/lib/server/ai/workerHeartbeat";
import { getSupabaseServiceConfig } from "@/lib/server/supabase/egressGuard";
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

/**
 * 봇 processing 행 stuck 판정 임계(ms). 봇 분석은 핸들러 TIMEOUT_TOTAL_MS(~50분)까지 정상 실행되고
 * 진행 중엔 그 행이 살아있다(핸들러 SSE 연결이 소유). prod 의 짧은 재투입 컷오프(worker STUCK_TIMEOUT_MS
 * ~20분)를 봇 행에 그대로 쓰면 **건강한 장시간 분석**의 인플라이트 카드를 오탐 failed 처리한다.
 * → 최대 실행시간+마진(55분)을 넘겨 '연결 유실(핸들러 프로세스 크래시)'이 확실할 때만 failed 종결한다.
 */
const BOT_STUCK_MS = 55 * 60_000;

/**
 * 사망 워커 행을 **fast-recover 하기 위한 최소 나이**(ms) = 하트비트 TTL(60s).
 *
 * 워커는 claim(`claimNextPending` 이 worker_id 세팅) 직후가 아니라 **별도 타이머 beat** 로 워커별
 * 하트비트를 올린다 — claim 과 첫 성공 beat 사이엔 그 워커의 키가 아직 KV 에 없다(게다가 write 는
 * fail-soft 라 조용히 실패할 수 있다). 이 창에서 '키 부재=사망' 으로 읽어 즉시 복구하면 **라이브 워커가
 * 방금 claim 해 지금 스트리밍 중인 행을 이중 처리**한다(12분짜리 분석 2회 = 토큰 낭비 + decision upsert 경합).
 *
 * → 사망 판정만으로는 부족하고 행이 이 나이(=TTL)를 넘겨야만 fast-recover 한다:
 *   (a) 라이브 워커면 claim 후 ~20s 안에 beat 가 반드시 도달 → 다음 조회가 `alive` 로 뒤집혀 보호되고,
 *   (b) 진짜 죽었으면(첫 beat 도 못 올림) 키가 계속 부재라 60s 뒤 그대로 복구된다.
 *   어느 쪽이든 20분 시간 컷오프보다 훨씬 빠르다.
 */
export const DEAD_RECOVER_AGE_FLOOR_MS = HEARTBEAT_TTL_SEC * 1000;

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
  return getSupabaseServiceConfig();
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
  /** 요청 계정 이메일(analyze-owner-filter). 미로그인/미상이면 생략(컬럼 default null). */
  requestedBy?: string | null;
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
  // 소유자 — 확보 시에만. 인플라이트 카드도 계정별로 걸러진다.
  if (input.requestedBy) insertBody.requested_by = input.requestedBy;

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
  requestedBy?: string | null;
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
      requested_by: input.requestedBy ?? null,
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
  /** 요청 계정 이메일(analyze-owner-filter). 세션에서 확보되면 전달. */
  requestedBy?: string | null;
}): Promise<{ jobId: number | null; owned: boolean; requestedBy: string | null }> {
  // prod 워커 경로 — 이미 claim 된 행 재사용, 종결은 워커가(중복 행·이중 종결 방지, G4).
  // ⚠️ 워커 요청에는 쿠키가 없다 → 소유자는 **queue 행에서 서버가 조회**한다(요청 body 신뢰 X).
  if (input.jobId != null) {
    return {
      jobId: input.jobId,
      owned: false,
      requestedBy: input.requestedBy ?? (await getJobRequestedBy(input.jobId)),
    };
  }

  // 직접 실행(로컬/봇) — 같은 ticker active 행 재사용 or 신규 insert. 종결은 핸들러가(owned=true).
  const active = await findActiveByTicker(input.ticker);
  if (active) {
    if (active.status === "pending") {
      await patchById(active.id, {
        status: "processing",
        claimed_at: new Date().toISOString(),
      });
    }
    return {
      jobId: active.id,
      owned: true,
      requestedBy: input.requestedBy ?? active.requestedBy,
    };
  }
  const id = await insertProcessingRow({
    ticker: input.ticker,
    source: input.source,
    workerId: input.workerId,
    requestedBy: input.requestedBy,
  });
  return { jobId: id, owned: id != null, requestedBy: input.requestedBy ?? null };
}

/** queue 행의 소유자만 조회(prod 워커 경로 — 요청에 쿠키가 없어 세션으로 못 구할 때). 실패 시 null. */
async function getJobRequestedBy(id: number): Promise<string | null> {
  const config = supabaseConfig();
  if (!config) return null;

  const url = new URL(`${config.url}/rest/v1/${TABLE}`);
  url.searchParams.set("id", `eq.${id}`);
  url.searchParams.set("select", "requested_by");
  url.searchParams.set("limit", "1");

  const res = await fetch(url, {
    method: "GET",
    headers: { ...headers(config.key), Accept: "application/json" },
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return null;

  const rows = (await res.json().catch(() => [])) as Array<{ requested_by: string | null }>;
  return Array.isArray(rows) && rows[0] ? rows[0].requested_by : null;
}

/**
 * 활성(pending/processing) 작업 전체를 최신순(created_at desc)으로 반환한다(/analyze 인플라이트 합성용).
 * 미설정/오류/컬럼 미적용 시 빈 배열(fail-soft) — 완료 결과 카드는 그대로 뜨고 인플라이트만 미표시.
 */
export async function getActiveJobs(
  limit = 200,
  requestedBy: string | null = null,
): Promise<AnalysisQueueRow[]> {
  const config = supabaseConfig();
  if (!config) return [];

  const url = new URL(`${config.url}/rest/v1/${TABLE}`);
  url.searchParams.set("select", SELECT_COLS);
  url.searchParams.set("status", "in.(pending,processing)");
  // 뷰어 스코프 — 로그인은 내 작업만, 미로그인은 세션 없이 넣은 작업만(소유자 컬럼 null).
  // 결정 테이블은 PK 라 ''를 쓰지만 큐는 nullable 이라 null 그대로 둔다(전이 중 행이라 legacy 무관).
  url.searchParams.set(
    "requested_by",
    requestedBy ? `eq.${requestedBy}` : "is.null",
  );
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
  //    ⚠️ source='bot' 행은 제외한다 — 봇 요청은 봇이 연 SSE 통로(핸들러) 위에서 직접 드레인하므로,
  //    워커가 집으면 헤드리스로 이중 실행돼 Slack 라이브 스트림이 사라진다(bot-analysis-sse-tunnel).
  //    source 컬럼은 마이그레이션에서 기존 행을 'prod' 로 백필했고 default 도 'prod' 라 null 은 없다.
  const findUrl = new URL(`${config.url}/rest/v1/${TABLE}`);
  findUrl.searchParams.set("select", "id");
  findUrl.searchParams.set("status", "eq.pending");
  findUrl.searchParams.set("source", "neq.bot");
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
 * 소유 워커의 생존 판정(recoverStuck 내부). 워커별 하트비트로 결정한다.
 * - `dead`      — 하트비트 부재/만료 → 워커 확실히 죽음 → **즉시** 복구(fast path, 나이 무관).
 * - `alive`     — 하트비트 있음 → 워커 살아있음 → 사망 근거 복구 금지(시간 컷오프 폴백만).
 * - `indeterminate` — 하트비트 조회가 store 장애로 실패(throw) → 사망으로 오판 금지(fail-safe).
 *   `alive` 와 동일하게 취급(시간 컷오프 폴백만) — KV 오류로 라이브 행을 오복구하지 않는다.
 */
type WorkerLiveness = "dead" | "alive" | "indeterminate";

/**
 * processing 에 잔류한 stuck row 를 복구한다(PRD AC-10/§9 q2 + queue-per-worker-heartbeat).
 *
 * **판정(비-봇 행):**
 *   1) 소유 워커가 죽었고(워커별 하트비트 만료) **행이 ≥60s(DEAD_RECOVER_AGE_FLOOR_MS) 됐으면** → 즉시 복구.
 *      사망이라도 60s 미만이면 이번 사이클 **보류** — 방금 claim 한 라이브 워커가 아직 첫 beat 를 못 올렸을
 *      뿐일 수 있어(fail-soft) 그 행을 이중 처리하지 않는다. (young 사망은 20분 컷오프로 보내지 않고,
 *      다음 사이클에 60s 를 넘기면 복구한다 — '첫 beat 전 사망' 을 과도 지연시키지 않기 위함.)
 *   2) 워커가 살아있거나(하트비트 존재) 판정 불가(하트비트 조회 실패)면 → 사망 근거 복구를 하지 않고,
 *      기존 **시간 컷오프**(`claimed_at < now-timeoutMs`)에 걸릴 때만 복구(hung CLI 안전망 보존).
 *   3) worker_id 가 없으면(legacy 행) → 시간 컷오프 폴백.
 *
 * **정책(복구 시):** pending 재투입 1회, 2회째 stuck 이면 failed 종결(무한 루프 방지, `[recovered:N]` 마커).
 * **봇 행:** 변경 없음 — 55분(BOT_STUCK_MS) 넘겨 연결 유실이 확실할 때만 failed.
 *
 * **안전 불변식:**
 *   - 현재 워커의 건강한 in-progress 행은 (a) 자기 하트비트가 살아있어 사망 복구 대상이 아니고,
 *     (b) 20분 내 완료되므로 컷오프에도 안 걸린다 → 이중 처리 없음.
 *   - 방금 claim 해 아직 첫 beat 전인 라이브 워커의 행은 60s 나이 플로어가 보호한다(사망 오판 즉시복구 차단).
 *   - 하트비트 조회 실패는 `indeterminate` 로 흡수(사망 오판 금지, fail-safe).
 *
 * @returns 이번 사이클에 복구(재투입)되거나 failed 종결된 row 수. 미설정/오류 시 0(fail-soft).
 */
export async function recoverStuck(timeoutMs: number): Promise<number> {
  const config = supabaseConfig();
  if (!config) return 0;

  const now = Date.now();
  const cutoffMs = now - timeoutMs;

  // ⚠️ 시간 컷오프를 **쿼리에서 빼고** processing 행을 넓게 조회한다 — fast path 는 죽은 워커의 행을
  //   (컷오프보다 훨씬 이른) 60s 플로어만 넘기면 복구해야 하는데, `claimed_at<cutoff` 필터를 걸면 그
  //   행이 안 잡힌다. 컷오프/플로어는 아래 per-row 판정에서 적용한다.
  //   컷오프 필터가 없어 행이 많을 수 있으니 **오래된 순(claimed_at asc)** 으로 정렬 + limit 로 상한 —
  //   >50 행이 쌓여도 가장 오래된 stuck 행이 굶지 않는다(F4).
  const url = new URL(`${config.url}/rest/v1/${TABLE}`);
  url.searchParams.set("select", "id,error,claimed_at,source,worker_id");
  url.searchParams.set("status", "eq.processing");
  url.searchParams.set("order", "claimed_at.asc");
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
    source: AnalysisJobSource | null;
    worker_id: string | null;
  }[];
  if (!Array.isArray(rows) || rows.length === 0) return 0;

  // 같은 워커가 여러 행을 소유할 수 있으니 하트비트 조회를 workerId 당 1회로 캐시(KV 부하·일관성).
  const livenessCache = new Map<string, WorkerLiveness>();
  const livenessOf = async (workerId: string): Promise<WorkerLiveness> => {
    const cached = livenessCache.get(workerId);
    if (cached) return cached;
    let liveness: WorkerLiveness;
    try {
      const hb = await readWorkerHeartbeat(workerId);
      liveness = hb === null ? "dead" : "alive";
    } catch {
      // store 장애(타임아웃·에러) → 사망 오판 금지. 시간 컷오프로만 폴백(fail-safe, not fail-open).
      liveness = "indeterminate";
    }
    livenessCache.set(workerId, liveness);
    return liveness;
  };

  let recovered = 0;
  for (const row of rows) {
    // 봇 처리행: 진행 중엔 핸들러 SSE 연결이 살아있고 최대 ~50분까지 정상 실행된다. 재개할 연결이 없어
    // 재투입(pending)하면 워커가 skip(neq.bot)해 '대기중' 유령이 되므로 failed 로 종결하되 — 20분 컷오프만으로
    // 끄면 건강한 장시간 분석을 오탐한다. BOT_STUCK_MS(55분)을 넘겨 연결 유실(핸들러 크래시)이 확실할 때만 종결.
    if (row.source === "bot") {
      const claimedMs = row.claimed_at ? Date.parse(row.claimed_at) : Number.NaN;
      if (!Number.isFinite(claimedMs) || Date.now() - claimedMs < BOT_STUCK_MS) {
        continue; // 아직 진행 중일 수 있음 — 손대지 않음(카드 오탐 종결 방지)
      }
      await markFailed(row.id, "봇 분석 연결이 끊겨 중단됐어요.");
      queueLog.warn(
        `stuck bot 처리행 → failed 종결 id=${row.id}(연결 유실, ${Math.round((Date.now() - claimedMs) / 60_000)}분 경과)`,
      );
      recovered += 1;
      continue;
    }

    // 비-봇 행: 소유 워커 생존으로 복구 여부 결정.
    const claimedMs = row.claimed_at ? Date.parse(row.claimed_at) : Number.NaN;
    const pastCutoff = Number.isFinite(claimedMs) && claimedMs < cutoffMs;
    // 사망 fast-recover 자격 = 행이 ≥60s(하트비트 TTL) 됐는가. 방금 claim 한 라이브 워커가 아직 첫
    //   beat 를 못 올린 창을 이 플로어가 보호한다. claimed_at 이 null/파싱불가면 자격 없음(=false).
    const pastDeadFloor =
      Number.isFinite(claimedMs) && now - claimedMs >= DEAD_RECOVER_AGE_FLOOR_MS;

    let shouldRecover: boolean;
    if (row.worker_id) {
      const liveness = await livenessOf(row.worker_id);
      // 사망 확정이라도 60s 플로어를 넘겨야 즉시 복구(첫 beat 전 라이브 워커 오복구 차단). 60s 미만이면
      //   이번 사이클 보류 → 다음 사이클에 라이브면 alive 로 뒤집히고, 진짜 죽었으면 60s 뒤 복구된다.
      //   살아있음/판정불가 → 사망 근거 복구 금지, 시간 컷오프에 걸릴 때만(hung 안전망).
      shouldRecover = liveness === "dead" ? pastDeadFloor : pastCutoff;
    } else {
      // worker_id 부재(legacy/edge) → 기존 시간 컷오프 동작 유지.
      shouldRecover = pastCutoff;
    }
    if (!shouldRecover) continue;

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
