/**
 * useStockNavClick — "종목 분석" 네비 항목 클릭 핸들러 (Sidebar·BottomNav 공유).
 *
 * 배경: 데스크탑 Sidebar 와 모바일 BottomNav 가 동일 로직을 각자 복제(byte-for-byte)하고 있었고,
 *       최근 본 종목이 없을 때 홈(`/`)으로 튕겨 홈 메뉴가 활성화되는 버그가 있었다.
 *       단일 훅으로 추출해 정합성을 확보하고 폴백을 `/stock`(검색 랜딩)으로 교정한다.
 *
 * 동작:
 *   - 이미 종목 상세(`/stock/*`)에 있으면(active) 아무것도 안 함.
 *   - 최근 검색 종목이 있으면 `/stock/<ticker>?q=<종목명>` 으로 이동
 *     → 상세 페이지가 검색창에 종목명을 미리 채운 상태로 렌더(StockSearchContainer initialKeyword).
 *   - 없으면 `/stock` 검색 랜딩 페이지로 이동(어느 경우에도 홈으로 가지 않음).
 */

"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { readRecentSearches } from "@/lib/utils/recentSearch";
import { stockDetailPath } from "@/lib/utils/stockDetailPath";

export function useStockNavClick() {
  const router = useRouter();

  return useCallback(
    (e: React.MouseEvent, active: boolean) => {
      e.preventDefault();
      if (active) return; // 이미 종목 상세 페이지 — 그대로 유지
      const recent = readRecentSearches();
      if (recent.length > 0) {
        const { ticker, name } = recent[0];
        router.push(stockDetailPath(ticker, name));
      } else {
        router.push("/stock");
      }
    },
    [router],
  );
}
