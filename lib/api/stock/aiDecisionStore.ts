/**
 * AI 분석 결정 이력 — localStorage 기반 (Supabase 연동 전 단계).
 * ticker당 최근 3개 유지. PM 프롬프트에 과거 결정 컨텍스트 주입용.
 */

import type { FinalDecision } from "@/lib/types/stock/aiAnalysis";

export interface AIDecisionEntry {
  ticker: string;
  date: string;
  verdict: FinalDecision["verdict"];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reasoning: string;
  target_pct: number | null;
  stop_loss_pct: number;
  short_term_outlook: string;
  mid_term_outlook: string;
}

const STORAGE_KEY = "ai-decision-log";
const MAX_PER_TICKER = 3;

function readDecisions(): AIDecisionEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDecision(entry: AIDecisionEntry): void {
  try {
    const all = readDecisions();
    const others = all.filter(e => e.ticker !== entry.ticker);
    const same = all.filter(e => e.ticker === entry.ticker);
    const kept = [...same, entry].slice(-MAX_PER_TICKER);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...others, ...kept]));
  } catch {
    // localStorage 없거나 용량 초과 시 무시
  }
}

export function getRecentDecisions(ticker: string): AIDecisionEntry[] {
  return readDecisions()
    .filter(e => e.ticker === ticker)
    .slice(-MAX_PER_TICKER);
}
