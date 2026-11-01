/**
 * `swing_ai_notes` Supabase REST 저장소(서버 전용, PRD `swing-judgment` PR-4). SQL = `docs/sql/swing-ai-notes.sql`.
 *
 * 노트 테이블 자체가 요청 큐다: 화면 요청 → pending 1행 → 로컬 워커가 claim(processing) → done/failed.
 * ⚠️ 이 모듈은 `swing_judgments`(판정)를 읽지도 쓰지도 않는다 — AI 는 판정에 손대지 않는다(테스트로 고정).
 */

import { getSupabaseServiceConfig } from "@/lib/server/supabase/egressGuard";
import type { SwingNoteItem } from "@/lib/swing/note";
import type { SwingNote } from "@/lib/types/swing/api";

const TABLE = "swing_ai_notes";
const COLUMNS = "id,ticker,status,items,error,created_at,finished_at";
/** 같은 종목 완료 노트를 다시 쓰는 기간 — 이 안에 다시 요청하면 새로 만들지 않는다. */
export const NOTE_FRESH_MS = 6 * 3_600_000;
/** 대기(pending) 상한 — 넘으면 새 요청을 받지 않는다(워커 꺼짐·남용 대비). */
export const NOTE_PENDING_CAP = 20;

type Row = {
  id: number;
  ticker: string;
  status: SwingNote["status"];
  items: SwingNoteItem[] | null;
  error: string | null;
  created_at: string;
  finished_at: string | null;
};
export type ClaimedSwingNote = { id: number; ticker: string; name: string | null };

const toNote = (r: Row): SwingNote => ({
  id: r.id,
  ticker: r.ticker,
  status: r.status,
  items: r.items,
  error: r.error,
  createdAt: r.created_at,
  finishedAt: r.finished_at,
});

export function isSwingNoteStoreConfigured(): boolean {
  return getSupabaseServiceConfig() !== null;
}

/** REST 호출 — 미설정·네트워크 오류·비 2xx 는 throw(라우트가 503 으로, 워커는 조용히 건너뜀). */
async function rest<T>(query: string, init?: { method?: string; body?: unknown; prefer?: string }): Promise<T> {
  const config = getSupabaseServiceConfig();
  if (!config) throw new Error("supabase-not-configured");
  const res = await fetch(`${config.url}/rest/v1/${TABLE}?${query}`, {
    method: init?.method ?? "GET",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      ...(init?.prefer ? { Prefer: init.prefer } : {}),
    },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`swing note ${init?.method ?? "GET"} status=${res.status}`);
  return (init?.prefer === "return=minimal" ? null : await res.json()) as T;
}

export async function getLatestSwingNote(ticker: string): Promise<SwingNote | null> {
  const rows = await rest<Row[]>(`select=${COLUMNS}&ticker=eq.${encodeURIComponent(ticker)}&order=created_at.desc&limit=1`);
  return rows[0] ? toNote(rows[0]) : null;
}

/** 새로 만들지 않고 기존 노트를 돌려줄지 — 진행 중이거나, 완료된 지 NOTE_FRESH_MS 안이면. */
export function reusableNote(latest: SwingNote | null, now: number): SwingNote | null {
  if (!latest) return null;
  if (latest.status === "pending" || latest.status === "processing") return latest;
  if (latest.status === "done" && now - Date.parse(latest.createdAt) < NOTE_FRESH_MS) return latest;
  return null;
}

/** 노트 요청 — 재사용 가능하면 그것을, 아니면 pending 1행을 만든다. 대기 상한이면 "busy". */
export async function requestSwingNote(
  ticker: string,
  name: string,
  requestedBy: string | null,
  now = Date.now(),
): Promise<SwingNote | "busy"> {
  const reuse = reusableNote(await getLatestSwingNote(ticker), now);
  if (reuse) return reuse;
  const pending = await rest<{ id: number }[]>(`select=id&status=eq.pending&limit=${NOTE_PENDING_CAP}`);
  if (pending.length >= NOTE_PENDING_CAP) return "busy";
  const rows = await rest<Row[]>(`select=${COLUMNS}`, {
    method: "POST",
    body: { ticker, name, requested_by: requestedBy },
    prefer: "return=representation",
  });
  return toNote(rows[0]);
}

/** 가장 오래된 pending 1건을 processing 으로 — 조건부 PATCH 라 워커끼리 겹치지 않는다. 없으면 null. */
export async function claimNextSwingNote(workerId: string): Promise<ClaimedSwingNote | null> {
  const found = await rest<{ id: number }[]>("select=id&status=eq.pending&order=created_at.asc&limit=1");
  if (!found[0]) return null;
  const rows = await rest<ClaimedSwingNote[]>(`id=eq.${found[0].id}&status=eq.pending&select=id,ticker,name`, {
    method: "PATCH",
    body: { status: "processing", worker_id: workerId, claimed_at: new Date().toISOString() },
    prefer: "return=representation",
  });
  return rows[0] ?? null; // 0행 = 그 사이 다른 워커가 가져감
}

export async function finishSwingNote(id: number, result: { items: SwingNoteItem[] } | { error: string }): Promise<void> {
  const body =
    "items" in result
      ? { status: "done", items: result.items, error: null }
      : { status: "failed", error: result.error.slice(0, 300) };
  await rest(`id=eq.${id}`, {
    method: "PATCH",
    body: { ...body, finished_at: new Date().toISOString() },
    prefer: "return=minimal",
  });
}

/** 죽은 워커가 processing 으로 남긴 노트를 실패로 닫는다(재시도는 사용자가 다시 요청). */
export async function failStuckSwingNotes(timeoutMs: number, now = Date.now()): Promise<void> {
  const cutoff = new Date(now - timeoutMs).toISOString();
  await rest(`status=eq.processing&claimed_at=lt.${encodeURIComponent(cutoff)}`, {
    method: "PATCH",
    body: { status: "failed", error: "처리 시간이 초과됐어요.", finished_at: new Date(now).toISOString() },
    prefer: "return=minimal",
  });
}
