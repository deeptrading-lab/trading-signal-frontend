/**
 * 오토파일럿 런 영속 — Supabase REST write-through(세션 persistence.ts 미러). intraday-autopilot.
 *
 * in-memory(runStore)가 1차 진실, Supabase 는 백업: upsert fire-and-forget(fail-soft) +
 * 부팅 hydrate 1회. 스키마는 payload(jsonb) + 필터 최소 컬럼(id/status/owner/updated_at).
 * 런은 **owner 격리가 절대 규칙**이라 hydrate 도 내 owner 런만 로드한다(타 운영자 런은 이
 * 서버가 표시·스윕할 일이 없다 — 세션과 다른 스코프 축소).
 *
 * ⚠️ `docs/sql/paper-trading-autopilot.sql` 을 Supabase SQL Editor 에서 수동 1회 실행 필요.
 */

import { createLogger } from "@/lib/server/logTag";
import type {
  AutopilotRun,
  AutopilotScreenerSnapshot,
} from "@/lib/types/paperTrading/autopilot";

const log = createLogger("autopilot-persist");

const RUNS_TABLE = "paper_trading_autopilot_runs";
const SNAPSHOTS_TABLE = "paper_trading_autopilot_screener_snapshots";
/** hydrate 복원 상한 — 최근 런 히스토리(당일 active 복원 + 소량 이력)면 충분. */
const HYDRATE_RUN_LIMIT = 20;
/** 개별 REST 호출 타임아웃 — hydrate 가 스윕/API 진입을 무기한 블로킹하지 않게. */
const FETCH_TIMEOUT_MS = 4_000;

export type LoadAutopilotResult =
  | { status: "disabled" }
  | { status: "error" }
  | { status: "ok"; runs: AutopilotRun[] };

function supabaseConfig(): { url: string; key: string } | null {
  const url = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

function headers(key: string, extra?: Record<string, string>): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

/** 실패 로그 1회 억제(세션 persistence 관례) — 미설정/장애가 스윕마다 콘솔 도배하지 않게. */
let warnedOnce = false;
function warnOnce(message: string, error?: unknown): void {
  if (warnedOnce) return;
  warnedOnce = true;
  log.warn(`${message} — 이후 동일 경고 생략`, error);
}

/** 런 스냅샷 upsert(fire-and-forget) — 실패해도 오토파일럿 흐름 비차단. */
export async function persistAutopilotRun(run: AutopilotRun): Promise<void> {
  const config = supabaseConfig();
  if (!config) return;
  try {
    const res = await fetch(`${config.url}/rest/v1/${RUNS_TABLE}?on_conflict=id`, {
      method: "POST",
      headers: headers(config.key, { Prefer: "resolution=merge-duplicates,return=minimal" }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      body: JSON.stringify([
        {
          id: run.id,
          status: run.status,
          owner: run.owner,
          payload: run,
          updated_at: run.updatedAt,
        },
      ]),
    });
    if (!res.ok) warnOnce(`런 저장 실패 HTTP ${res.status}`, await res.text().catch(() => ""));
  } catch (error) {
    warnOnce("런 저장 실패(네트워크)", error);
  }
}

/**
 * 스크리너 스냅샷 append(fire-and-forget) — 종목 선정 품질 사후 검증 데이터(쓰기 전용, hydrate 없음).
 * id PK(`runId:창시작`)라 같은 창 재시도는 무시(멱등). 실패해도 스윕 흐름 비차단.
 */
export async function persistAutopilotScreenerSnapshot(
  snapshot: AutopilotScreenerSnapshot,
): Promise<void> {
  const config = supabaseConfig();
  if (!config) return;
  try {
    const res = await fetch(`${config.url}/rest/v1/${SNAPSHOTS_TABLE}?on_conflict=id`, {
      method: "POST",
      headers: headers(config.key, { Prefer: "resolution=ignore-duplicates,return=minimal" }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      body: JSON.stringify([
        {
          id: snapshot.id,
          run_id: snapshot.runId,
          owner: snapshot.owner,
          payload: snapshot,
          created_at: snapshot.at,
        },
      ]),
    });
    if (!res.ok)
      warnOnce(`스냅샷 저장 실패 HTTP ${res.status}`, await res.text().catch(() => ""));
  } catch (error) {
    warnOnce("스냅샷 저장 실패(네트워크)", error);
  }
}

/**
 * 내 owner 런 로드(부팅 hydrate 용) — 최근 업데이트순 상한 개.
 * 미설정 → disabled(성공 취급) / 실패 → error(호출측이 다음 접근에서 재시도).
 */
export async function loadPersistedAutopilotRuns(owner: string): Promise<LoadAutopilotResult> {
  const config = supabaseConfig();
  if (!config) return { status: "disabled" };
  try {
    const res = await fetch(
      `${config.url}/rest/v1/${RUNS_TABLE}?select=payload&owner=eq.${encodeURIComponent(owner)}` +
        `&order=updated_at.desc&limit=${HYDRATE_RUN_LIMIT}`,
      {
        headers: headers(config.key),
        cache: "no-store",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );
    if (!res.ok) {
      warnOnce(`런 로드 실패 HTTP ${res.status}`);
      return { status: "error" };
    }
    const rows = (await res.json()) as Array<{ payload: AutopilotRun }>;
    return { status: "ok", runs: rows.map((row) => row.payload) };
  } catch (error) {
    warnOnce("런 저장본 로드 실패(네트워크/타임아웃)", error);
    return { status: "error" };
  }
}
