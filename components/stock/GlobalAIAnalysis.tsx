"use client";

import { AIAnalysisPanel } from "./AIAnalysisPanel";
import { useAIAnalysisContext } from "@/hooks/stock/aiAnalysisProvider";
import { INITIAL_AGENT_STATES } from "@/lib/types/stock/aiAnalysis";

/**
 * AI 분석 패널·재열기 탭의 전역 호스트 — `(main)` 레이아웃에 mount.
 *
 * 패널을 종목 상세 페이지가 아니라 셸에 두어, 분석 중 다른 페이지로 이동해도 스트림이 끊기지
 * 않고 백그라운드에서 계속 진행되게 한다. 컨텍스트의 analyzingTicker(분석 주인) / viewTicker
 * (패널 표시 대상)를 조합해 패널 본문을 라이브/유휴로 투영한다.
 */
export function GlobalAIAnalysis() {
  const ctx = useAIAnalysisContext();
  const { analyzingTicker, viewTicker, isOpen } = ctx;

  // 패널이 보여줄 종목: 열려 있으면 viewTicker, 닫혀 있으면(재열기 탭만 노출) 분석 중인 종목.
  const panelTicker = isOpen ? viewTicker : analyzingTicker;
  if (!panelTicker) return null;

  // viewTicker 가 분석 중인 종목과 다르면(다른 종목 idle 진입) 라이브 상태를 가린다 —
  // 백그라운드 분석은 그대로 두고 패널 본문만 그 종목의 빈 진입(공급자 선택/이전 결론)으로.
  const idleView = isOpen && viewTicker !== analyzingTicker;

  const projected = idleView
    ? {
        agents: INITIAL_AGENT_STATES,
        reports: {},
        debate: [],
        debatingSide: null,
        final: null,
        sentiment: null,
        error: null,
        resumeFrom: null,
        isRunning: false,
        showReanalysisPrompt: false,
        doneCount: 0,
      }
    : {
        agents: ctx.agents,
        reports: ctx.reports,
        debate: ctx.debate,
        debatingSide: ctx.debatingSide,
        final: ctx.final,
        sentiment: ctx.sentiment,
        error: ctx.error,
        resumeFrom: ctx.resumeFrom,
        isRunning: ctx.isRunning,
        showReanalysisPrompt: ctx.showReanalysisPrompt,
        doneCount: ctx.doneCount,
      };

  return <AIAnalysisPanel {...ctx} {...projected} ticker={panelTicker} />;
}
