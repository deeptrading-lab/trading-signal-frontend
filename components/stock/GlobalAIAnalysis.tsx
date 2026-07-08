"use client";

import { memo, useMemo } from "react";
import dynamic from "next/dynamic";
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
 *
 * 코드 스플리팅(perf WS-1): 패널은 분석이 실제로 열릴 때만 필요하므로 `next/dynamic({ssr:false})`
 * 로 지연 로드한다. 이로써 motion/react-markdown + 14개 ai-analysis 서브컴포넌트가 셸 청크에서
 * 빠지고, 패널이 닫힌(panelTicker=null) 비-AI 라우트에서는 해당 청크가 로드되지 않는다.
 */
const AIAnalysisPanel = dynamic(
  () => import("./AIAnalysisPanel").then((m) => m.AIAnalysisPanel),
  { ssr: false },
);

export const GlobalAIAnalysis = memo(function GlobalAIAnalysis() {
  const ctx = useAIAnalysisContext();
  // 이름을 **이미 아는 탭**(리스트/openFor 로 넘어온)은 재조회하지 않는다 — 미상 티커만
  // useQueryStockNames 로 해석(재매칭 제거). 메모이즈로 useQueries 매핑 churn 방지, 조건부 hook 금지.
  const unknownTickers = useMemo(
    () => ctx.tabs.filter((t) => !t.name).map((t) => t.ticker),
    [ctx.tabs],
  );
  const names = useQueryStockNames(unknownTickers);
  if (!ctx.panelTicker) return null;
  // 아는 이름 우선, 없을 때만 조회 결과(그래도 없으면 null → 패널이 티커 폴백).
  const tabs = ctx.tabs.map((t) => ({ ...t, name: t.name ?? names[t.ticker] ?? null }));
  return <AIAnalysisPanel {...ctx} tabs={tabs} ticker={ctx.panelTicker} />;
});
