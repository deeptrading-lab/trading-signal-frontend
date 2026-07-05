"use client";

import dynamic from "next/dynamic";

/**
 * Peek 오버레이의 지연 로드 정의 + 청크 워밍 헬퍼.
 *
 * 팝오버/시트는 `MiniStockChart`(→ recharts)를 끌어오므로 셸 청크에서 빼고 실제로 열릴 때만
 * `next/dynamic({ssr:false})` 로 로드한다(mobile-perf 정합). 하지만 **첫 hover** 는 그 청크
 * 다운로드·파싱을 기다려야 해 미니 차트가 1~2초 뒤 뜬다.
 *
 * `preloadPeekChunk()` 는 같은 import 지정자를 미리 호출해 청크를 브라우저 모듈 레지스트리에 데운다
 *   — 이후 `dynamic` 마운트는 즉시. 마우스 기기에서 유휴 시점에 한 번만 호출한다(터치 전용 기기는
 *   hover peek 자체가 없어 recharts 를 미리 받지 않도록 호출 측에서 `(pointer: fine)` 게이트).
 */
export const StockPeekPopover = dynamic(
  () => import("./StockPeekPopover").then((m) => m.StockPeekPopover),
  { ssr: false },
);
export const StockPeekSheet = dynamic(
  () => import("./StockPeekSheet").then((m) => m.StockPeekSheet),
  { ssr: false },
);
/** 초광폭 우측 도킹 패널(hover 팝오버 대체). recharts 는 팝오버와 동일 공유 청크. */
export const StockPeekDock = dynamic(
  () => import("./StockPeekDock").then((m) => m.StockPeekDock),
  { ssr: false },
);

/** 팝오버 청크(→ recharts)를 미리 데운다. dynamic 과 동일 import 지정자라 같은 청크를 공유. */
export function preloadPeekChunk(): void {
  void import("./StockPeekPopover");
}
