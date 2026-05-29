/**
 * MarketPage — `/market` 셸 컴포저 (server component).
 *
 * PR8 (finsight-redesign) 신규.
 *
 * 책임:
 *   - 페이지 타이틀 "시장 동향" (Compass 아이콘 동반).
 *   - 2-column 그리드 (좌 = ThemesCard / 우 = IndicesCard).
 *
 * 구조 (위→아래):
 *   1. 페이지 타이틀 (`text-h1` + Compass).
 *   2. 2-column 그리드 (`md:grid-cols-2 gap-lg`):
 *      좌 = ThemesCard(mock 유지 — PRD §4 q2), 우 = IndicesCardContainer(KIS 실데이터).
 *
 * 모바일 정보 밀도 — 카드 1-column stacking. 데스크탑 (md+) — 2-column.
 *
 * 클라이언트/서버 (PRD `market-real-data` §3.5):
 *   - 본 컴포넌트(server) 는 셸·그리드만. ThemesCard 도 server(mock props).
 *   - 지수 영역은 `IndicesCardContainer`('use client') 가 `useQueryIndices` 로 실데이터 fetch.
 *   - page.tsx 가 themes mock props 전달(테마는 별도 트랙).
 *
 * Sidebar / BottomNav 의 "시장 동향" 메뉴 활성 — `isNavItemActive("/market", "/market")` true.
 */

import { Compass } from "lucide-react";
import { ThemesCard } from "./ThemesCard";
import { IndicesCardContainer } from "./IndicesCardContainer";
import type { MarketTheme } from "@/lib/types/market/themes";
import { MARKET_PAGE_TITLE } from "@/lib/copy/market/labels";

export interface MarketPageProps {
  themes: MarketTheme[];
}

export function MarketPage({ themes }: MarketPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-main-max-w flex-col gap-lg">
      <h1 className="inline-flex items-center gap-sm text-h1 text-text-strong">
        <Compass
          className="h-2xl w-2xl text-accent-vivid"
          aria-hidden="true"
        />
        {MARKET_PAGE_TITLE}
      </h1>

      <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
        <ThemesCard themes={themes} />
        <IndicesCardContainer />
      </div>
    </div>
  );
}
