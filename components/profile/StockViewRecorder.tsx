/**
 * StockViewRecorder — `/stock/[ticker]` 진입 시 "마지막으로 본 종목"을 최근 검색에 기록.
 *
 * server-safe 컴포저(`StockProfilePage`)에 side-effect 훅을 얹기 위한 최소 클라이언트 경계.
 * 렌더 산출물은 없다(`null`) — 오직 `useRecordStockView` 실행 목적. 상세 UI 는 형제 컴포넌트가 담당.
 */

"use client";

import { useRecordStockView } from "@/hooks/stock/useRecordStockView";

export function StockViewRecorder({ ticker }: { ticker: string }) {
  useRecordStockView(ticker);
  return null;
}
