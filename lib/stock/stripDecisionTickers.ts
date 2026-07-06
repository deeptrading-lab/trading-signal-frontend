/**
 * `FinalDecision` 의 자유서술 텍스트 필드에서 종목 코드(티커)를 제거한다.
 *
 * AI 최종 판정(PM 산출)은 라이브 스트림(provider projection)과 저장 스냅샷(useQueryAIDecision) 두 경로로
 * 표시된다. 두 경로가 동일한 필드 집합을 같은 방식으로 정리하도록 이 헬퍼 한 곳으로 모은다(필드 목록 드리프트 방지).
 *
 * 정리 대상은 **본문 텍스트 필드만** — verdict(enum)·수치(target/stop/RR/base_price)·time_horizon·model 등은 건드리지 않는다.
 */

import { stripTickerCode } from "@/lib/utils/stripTickerCode";
import type { FinalDecision } from "@/lib/types/stock/aiAnalysis";

export function stripDecisionTickers(
  decision: FinalDecision,
  ticker: string | null | undefined,
): FinalDecision {
  if (!ticker || !ticker.trim()) return decision;
  const strip = (text: string) => stripTickerCode(text, ticker);
  return {
    ...decision,
    reasoning: strip(decision.reasoning),
    new_entry_strategy: strip(decision.new_entry_strategy),
    holder_strategy: strip(decision.holder_strategy),
    short_term_outlook: strip(decision.short_term_outlook),
    mid_term_outlook: strip(decision.mid_term_outlook),
    key_strengths: decision.key_strengths.map(strip),
    key_risks: decision.key_risks.map(strip),
  };
}
