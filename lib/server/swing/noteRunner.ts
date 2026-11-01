/**
 * 스윙 AI 노트 실행(로컬 워커 전용, PRD `swing-judgment` PR-4) — CLI 에이전트 1회(웹 검색) → 고정 JSON →
 * `validateSwingNote` → 노트 저장소. 판정 데이터는 입력으로 주지도, 출력으로 받지도 않는다.
 */

import { invokeAgentCli } from "@/lib/server/ai/agentCli";
import { parseLooseJson } from "@/lib/server/ai/parseLooseJson";
import { NOTE_CATEGORIES, NOTE_DIRECTIONS, NOTE_LOOKBACK_DAYS, NOTE_MATERIALITY, NOTE_MAX_ITEMS, validateSwingNote } from "@/lib/swing/note";
import type { AIAnalysisProvider } from "@/lib/types/stock/aiAnalysis";
import { finishSwingNote, type ClaimedSwingNote } from "./noteStore";
import { kstToday } from "./tradeDate";

const NOTE_TIMEOUT_MS = 6 * 60_000;

export function buildSwingNotePrompt(ticker: string, name: string, today: string): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = [
    "너는 한국 상장사 뉴스·공시 수집기다. 투자 판단·주가 전망·매매 권유를 하지 않는다.",
    "아래 JSON 하나만 출력한다(코드 블록·설명 문장 금지).",
    `{"items":[{"date":"YYYY-MM-DD","title":"기사·공시 제목 원문","source":"매체명 또는 DART","url":"https://…","category":"${NOTE_CATEGORIES.join("|")}","direction":"${NOTE_DIRECTIONS.join("|")}","materiality":"${NOTE_MATERIALITY.join("|")}","summary":"사실만 한 문장(60자 안팎)"}]}`,
    "규칙:",
    `- 기준일 ${today} 부터 최근 ${NOTE_LOOKBACK_DAYS}일 안의 기사·공시만. 날짜를 확인할 수 없으면 넣지 않는다.`,
    `- 같은 사건은 1건으로 묶는다. 최대 ${NOTE_MAX_ITEMS}건, 중요한 순.`,
    "- url 은 실제로 열어 확인한 원문 주소만 쓴다. 추측해서 만들지 않는다.",
    "- direction 은 그 소식이 회사 실적·사업에 주는 영향의 방향이다(주가 예측이 아님). 애매하면 neutral.",
    "- summary 에 '사세요·추천·오를 것·확실' 같은 권유·전망 표현을 쓰지 않는다.",
    '- 관련 소식이 없으면 {"items":[]}.',
  ].join("\n");
  const userPrompt = `종목: ${name} (${ticker}). 기준일: ${today}. 최근 ${NOTE_LOOKBACK_DAYS}일 뉴스·공시를 웹에서 찾아 위 JSON 으로만 답해.`;
  return { systemPrompt, userPrompt };
}

/** 모델 응답 JSON — 마지막 닫는 괄호를 빠뜨린 응답(실측 2회 중 1회)은 한 번 보정해 읽는다. */
export function parseNoteJson(text: string): unknown {
  const t = text.trim();
  return parseLooseJson(t) ?? parseLooseJson(`${t}}`) ?? parseLooseJson(`${t}]}`);
}

/** claim 된 노트 1건을 끝까지 처리한다. **throw 하지 않는다**(항상 done/failed 로 닫는다). */
export async function runSwingNote(job: ClaimedSwingNote, provider: AIAnalysisProvider | null): Promise<void> {
  const close = (result: Parameters<typeof finishSwingNote>[1]) => finishSwingNote(job.id, result).catch(() => undefined);
  if (!provider) return close({ error: "사용 가능한 AI CLI(claude/codex)가 없어요." });
  const today = kstToday();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), NOTE_TIMEOUT_MS);
  try {
    const { systemPrompt, userPrompt } = buildSwingNotePrompt(job.ticker, job.name ?? job.ticker, today);
    const text = await invokeAgentCli({ provider, systemPrompt, userPrompt, webSearch: true, timeoutMs: NOTE_TIMEOUT_MS, signal: ac.signal });
    const items = validateSwingNote(parseNoteJson(text), today);
    await close(items ? { items } : { error: "AI 응답 형식이 올바르지 않아요." });
  } catch (e) {
    await close({ error: e instanceof Error ? e.message : String(e) });
  } finally {
    clearTimeout(timer);
  }
}
