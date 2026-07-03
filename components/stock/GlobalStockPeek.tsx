"use client";

import dynamic from "next/dynamic";
import {
  useStockPeekActions,
  useStockPeekState,
} from "@/hooks/stock/peekProvider";

/**
 * GlobalStockPeek — Peek 오버레이의 전역 호스트. `(main)` 레이아웃에 1회 mount.
 *
 * 활성 Peek(단일)을 받아 팝오버(hover) 또는 시트(롱프레스)를 렌더한다. 상태를 셸에 두어 어느
 * 화면(홈·관심·검색)에서 소환하든 같은 오버레이 하나로 처리한다(GlobalAIAnalysis 와 동형).
 *
 * ## 코드 스플리팅(mobile-perf 정합)
 * 팝오버/시트는 `MiniStockChart`(→ recharts)를 끌어오므로, Peek 이 실제로 열릴 때만 필요하다.
 * `next/dynamic({ssr:false})` 로 지연 로드해 recharts 가 셸 청크에서 빠지고, Peek 을 한 번도
 * 소환하지 않은 라우트에서는 로드되지 않는다.
 */
const StockPeekPopover = dynamic(
  () => import("./StockPeekPopover").then((m) => m.StockPeekPopover),
  { ssr: false },
);
const StockPeekSheet = dynamic(
  () => import("./StockPeekSheet").then((m) => m.StockPeekSheet),
  { ssr: false },
);

export function GlobalStockPeek() {
  const peek = useStockPeekState();
  const actions = useStockPeekActions();
  if (!peek || !actions) return null;

  if (peek.mode === "popover") {
    return <StockPeekPopover target={peek} onHide={actions.hidePopover} />;
  }
  return <StockPeekSheet target={peek} onClose={actions.close} />;
}
