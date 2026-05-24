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
 *      좌 = ThemesCard, 우 = IndicesCard.
 *
 * 모바일 정보 밀도 — 카드 1-column stacking. 데스크탑 (md+) — 2-column.
 *
 * 클라이언트/서버:
 *   - 본 컴포넌트 + 자식 모두 server-safe (useState 0).
 *   - page.tsx 가 mock props 전달.
 *
 * BFF 무관 — PR8 mock 단계로 BE 호출 0건. fetch · axios 호출 0건.
 *
 * Sidebar / BottomNav 의 "시장 동향" 메뉴 활성 — `isNavItemActive("/market", "/market")` true.
 */

import { Compass } from "lucide-react";
import { ThemesCard } from "./ThemesCard";
import { IndicesCard } from "./IndicesCard";
import type { MarketTheme } from "@/lib/types/market/themes";
import type { MarketIndex } from "@/lib/types/market/indices";
import { MARKET_PAGE_TITLE } from "@/lib/copy/market/labels";

export interface MarketPageProps {
  themes: MarketTheme[];
  indices: MarketIndex[];
}

export function MarketPage({ themes, indices }: MarketPageProps) {
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
        <IndicesCard indices={indices} />
      </div>
    </div>
  );
}
