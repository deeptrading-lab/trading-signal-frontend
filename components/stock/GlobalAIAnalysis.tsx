"use client";

import { AIAnalysisPanel } from "./AIAnalysisPanel";
import { useAIAnalysisContext } from "@/hooks/stock/aiAnalysisProvider";
import { useQueryStockNames } from "@/hooks/stock/useQueryStockNames";

/**
 * AI 분석 패널·재열기 탭의 전역 호스트 — `(main)` 레이아웃에 mount.
 *
 * 패널을 종목 상세 페이지가 아니라 셸에 두어, 분석 중 다른 페이지로 이동해도 스트림이 끊기지
 * 않고 백그라운드에서 계속 진행되게 한다. 패널 본문 투영(활성 슬롯 → 평면 필드)은 컨텍스트가
 * 담당하므로, 호스트는 표시 대상 종목(panelTicker)만 받아 패널을 렌더한다.
 *
 * 동시 분석 탭 라벨은 ticker 가 아니라 **종목명**으로 보여준다 — 탭의 ticker 들을
 * useQueryStockNames 로 해석(useQueryStockPrice 와 캐시 공유, 중복 호출 0)해 주입한다.
 * 미해석 ticker 는 슬롯 캐시(name)→ticker 폴백.
 *
 * panelTicker: 열림=viewTicker(보는 종목), 닫힘=analyzingTicker(분석 주인). null 이면 미렌더.
 */
export function GlobalAIAnalysis() {
  const ctx = useAIAnalysisContext();
  const names = useQueryStockNames(ctx.tabs.map((t) => t.ticker));
  if (!ctx.panelTicker) return null;
  const tabs = ctx.tabs.map((t) => ({ ...t, name: names[t.ticker] ?? t.name }));
  return <AIAnalysisPanel {...ctx} tabs={tabs} ticker={ctx.panelTicker} />;
}
