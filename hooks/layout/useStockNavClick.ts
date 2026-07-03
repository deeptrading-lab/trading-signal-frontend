/**
 * useStockNavClick — "종목 분석" 네비 항목 바인딩 (Sidebar·BottomNav 공유).
 *
 * 배경: 데스크탑 Sidebar 와 모바일 BottomNav 가 동일 로직을 각자 복제(byte-for-byte)하고 있었고,
 *       최근 본 종목이 없을 때 홈(`/`)으로 튕겨 홈 메뉴가 활성화되는 버그가 있었다.
 *       단일 훅으로 추출해 정합성을 확보하고 폴백을 `/stock`(검색 랜딩)으로 교정한다.
 *
 * 클릭 동작(불변):
 *   - 이미 종목 상세(`/stock/*`)에 있으면(active) 아무것도 안 함.
 *   - 최근 검색 종목이 있으면 `/stock/<ticker>?q=<종목명>` 으로 이동
 *     → 상세 페이지가 검색창에 종목명을 미리 채운 상태로 렌더(StockSearchContainer initialKeyword).
 *   - 없으면 `/stock` 검색 랜딩 페이지로 이동(어느 경우에도 홈으로 가지 않음).
 *
 * 의도(intent) 선반입(stock-route-perf #2):
 *   Sidebar/BottomNav 는 `<Link href="/stock">` 를 렌더해 Next 가 **랜딩(`/stock`)만** prefetch 한다 —
 *   실제 목적지(`/stock/<ticker>`)의 RSC·청크와 시세/회사 데이터는 클릭 순간까지 차가운 채라 모바일에서
 *   1~2s 체감 지연이 났다. 이 훅이 최근 종목을 미리 해석해, 의도 신호(hover/focus/press)에서 실제
 *   목적지의 라우트(`router.prefetch`)와 데이터(`usePrefetchStockDetail`)를 함께 데운다. 최근 종목이
 *   없을 때만 no-op(랜딩은 Link 가 이미 prefetch). 클릭→push 동작은 그대로 유지된다.
 *
 * 반환: `(active) => { onClick, onPointerEnter, onPointerDown, onFocus }` — `/stock` 항목에 spread.
 *   데스크탑=pointerenter/focus(hover·키보드), 모바일=pointerdown(click 직전 발화). 모든 warm 은
 *   idempotent(router.prefetch 디듀프 + prefetchQuery 는 fresh 캐시 no-op)라 중복 호출이 무해하다.
 */

"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePrefetchStockDetail } from "@/hooks/stock/usePrefetchStockDetail";
import { readRecentSearches } from "@/lib/utils/recentSearch";
import { stockDetailPath } from "@/lib/utils/stockDetailPath";

export function useStockNavClick() {
  const router = useRouter();
  const { prefetch: prefetchDetailData } = usePrefetchStockDetail();

  // 최근 본 종목(최신) 해석 — 있으면 실제 목적지, 없으면 null(→ /stock 랜딩).
  const readTop = useCallback(() => {
    const recent = readRecentSearches();
    return recent.length > 0 ? recent[0] : null;
  }, []);

  // 확정 클릭 — 실제 목적지로 push(기존 동작 불변).
  const navigate = useCallback(
    (e: React.MouseEvent, active: boolean) => {
      e.preventDefault();
      if (active) return; // 이미 종목 상세 페이지 — 그대로 유지
      const top = readTop();
      router.push(top ? stockDetailPath(top.ticker, top.name) : "/stock");
    },
    [router, readTop],
  );

  // 의도 선반입 — 클릭 전에 실제 목적지의 라우트+데이터를 데운다(최근 종목 있을 때만).
  const warm = useCallback(
    (active: boolean) => {
      if (active) return; // 이미 상세 — 데울 대상 없음
      const top = readTop();
      if (!top) return; // 최근 종목 없음 → /stock 랜딩(Link 가 이미 prefetch)
      router.prefetch(stockDetailPath(top.ticker, top.name)); // 라우트 세그먼트+RSC(push 와 동일 URL)
      prefetchDetailData(top.ticker); // 상세 데이터(price+company) — usePrefetchStockDetail 재사용
    },
    [router, readTop, prefetchDetailData],
  );

  // `/stock` 네비 항목에 그대로 spread 할 바인딩(클릭 + 의도 prefetch).
  return useCallback(
    (active: boolean) => ({
      onClick: (e: React.MouseEvent) => navigate(e, active),
      onPointerEnter: () => warm(active),
      onPointerDown: () => warm(active),
      onFocus: () => warm(active),
    }),
    [navigate, warm],
  );
}
