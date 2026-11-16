import { createHash } from "node:crypto";
import type { PaperAppliedChange, PaperReviewEvent, PaperSessionReview } from "@/lib/types/programTrading/programTrading";
import { getSupabaseServiceConfig } from "@/lib/server/supabase/egressGuard";

const results = "program_paper_results";
const events = "program_paper_review_events";

async function request<T>(table: string, query: Record<string, string>, body?: object, ignoreDuplicates = false): Promise<T> {
  const config = getSupabaseServiceConfig();
  if (!config) throw new Error("Supabase 주소·서버 키 또는 SUPABASE_EGRESS_DISABLED 설정을 확인해 주세요.");
  const url = new URL(`${config.url}/rest/v1/${table}`);
  url.search = new URLSearchParams(query).toString();
  const headers: Record<string, string> = {
    apikey: config.key,
    "Content-Type": "application/json",
  };
  if (!config.key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${config.key}`;
  if (body) headers.Prefer = ignoreDuplicates ? "resolution=ignore-duplicates,return=minimal" : "return=minimal";
  let response: Response;
  try {
    response = await fetch(url, {
      method: body ? "POST" : "GET",
      body: body ? JSON.stringify(body) : undefined,
      headers,
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw new Error("Supabase에 연결하지 못했어요. 네트워크와 주소를 확인해 주세요.");
  }
  if (!response.ok) throw new Error(`Supabase 응답 ${response.status} · SQL 적용과 서버 키를 확인해 주세요.`);
  return (body ? undefined : await response.json()) as T;
}

export function paperResultId(startedAt: string) {
  // Archive folder names can change; the same local session keeps the same key.
  return createHash("sha256").update(`toss-paper:${startedAt}`).digest("hex").slice(0, 32);
}

export async function savePaperResult(review: PaperSessionReview) {
  const { startedAt, finishedAt, status } = review.lifecycle;
  if (status !== "completed" || !startedAt || !finishedAt) throw new Error("종료한 세션만 저장할 수 있어요.");
  const id = paperResultId(startedAt);
  await request(results, { on_conflict: "id" }, { id, started_at: startedAt, finished_at: finishedAt, result: review }, true);
  return id;
}

type PaperResultSummary = {
  id: string;
  finished_at: string;
  return_pct: number | null;
  balance_change?: number;
};

export const paperResultPageSize = 20;

export function listPaperResults(offset = 0, forScreen = false) {
  const fields = "id,started_at,finished_at,return_pct:result->lifecycle->returnPct,closed_trades:result->closedTrades";
  return request<PaperResultSummary[]>(results, {
    select: forScreen ? fields + ",balance_change:result->balanceChange" : fields,
    order: "finished_at.desc,id.asc", limit: String(paperResultPageSize + Number(forScreen)), offset: String(offset),
  });
}

export async function readPaperResult(id: string) {
  checkId(id);
  const [row] = await request<{ result: PaperSessionReview }[]>(results, { select: "result", id: `eq.${id}`, limit: "1" });
  if (!row) throw new Error("저장된 모의투자 결과를 찾지 못했어요.");
  return row.result;
}

export function listPaperReviewEvents(id: string, offset = 0) {
  checkId(id);
  return request<PaperReviewEvent[]>(events, {
    select: "id,created_at,kind,score,details", session_id: `eq.${id}`, order: "created_at.desc,id.asc",
    limit: "20", offset: String(offset),
  });
}

function checkId(id: string) {
  if (!/^[a-f0-9]{32}$/.test(id)) throw new Error("목록에 표시된 세션 ID를 입력해 주세요.");
}

export function savePaperReviewEvent(id: string, event:
  | { kind: "evaluation"; score: number; details: object }
  | { kind: "applied"; id?: string; details: PaperAppliedChange }) {
  checkId(id);
  return request(events, {}, { ...event, session_id: id }, "id" in event && !!event.id);
}

export async function readPaperImprovementSource(sessionId: string, evaluationId: string) {
  checkId(sessionId);
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(evaluationId)) throw new Error("올바른 평가를 선택해 주세요.");
  const [evaluation] = await request<Extract<PaperReviewEvent, { kind: "evaluation" }>[]>(events, {
    select: "id,created_at,kind,score,details",
    session_id: `eq.${sessionId}`, id: `eq.${evaluationId}`, kind: "eq.evaluation", limit: "1",
  });
  if (!evaluation?.details.proposals.length) throw new Error("이 세션에서 적용할 개선 제안을 찾지 못했어요.");
  const [applied] = await request<{ id: string }[]>(events, {
    select: "id", session_id: `eq.${sessionId}`, kind: "eq.applied",
    "details->>evaluationId": `eq.${evaluationId}`, limit: "1",
  });
  if (applied) throw new Error("이미 반영한 평가예요.");
  return evaluation;
}
