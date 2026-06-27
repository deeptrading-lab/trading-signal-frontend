"use client";

import { AIAnalysisPanel } from "./AIAnalysisPanel";
import { useAIAnalysisContext } from "@/hooks/stock/aiAnalysisProvider";

/**
 * AI 분석 패널·재열기 탭의 전역 호스트 — `(main)` 레이아웃에 mount.
 *
 * 패널을 종목 상세 페이지가 아니라 셸에 두어, 분석 중 다른 페이지로 이동해도 스트림이 끊기지
 * 않고 백그라운드에서 계속 진행되게 한다. 패널 본문 투영(활성 슬롯 → 평면 필드)은 컨텍스트가
 * 담당하므로, 호스트는 표시 대상 종목(panelTicker)만 받아 패널을 렌더한다.
 *
 * panelTicker: 열림=viewTicker(보는 종목), 닫힘=analyzingTicker(분석 주인). null 이면 미렌더.
 * 동시 분석이 여러 건이면 패널 인스턴스는 1개(활성 슬롯)이고, 다른 슬롯은 헤더 탭/재열기
 * 스택(tabs)으로 전환한다.
 */
export function GlobalAIAnalysis() {
  const ctx = useAIAnalysisContext();
  if (!ctx.panelTicker) return null;
  return <AIAnalysisPanel {...ctx} ticker={ctx.panelTicker} />;
}
