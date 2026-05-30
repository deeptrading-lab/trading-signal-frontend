/**
 * MarketOverviewPage — 홈(`/`) 시장 종합 대시보드 페이지 레이아웃.
 *
 * home-market-redesign PR2 신규.
 *
 * 서버 컴포넌트 — useState/useEffect 0. 클라이언트 경계는 각 컨테이너 컴포넌트.
 *
 * 레이아웃 (위→아래):
 *   1. 페이지 타이틀 "시장 종합" + BarChart3 아이콘
 *   2. StockSearchContainer — 종목 검색바 (client)
 *   3. IndicesCardContainer — 주요지수 (full-width, client)
 *   4. 2칸 그리드 (lg:grid-cols-2):
 *      - FearGreedContainer — 공포·탐욕 게이지 (client)
 *      - DisclosureFeedContainer — 최신 공시 피드 (client)
 *
 * DESIGN.md v9 §Layout 정합:
 *   - main-area 패딩 p-lg (모바일 18px) / lg:p-2xl (데스크탑 24px)
 *   - 위젯 사이 간격 home-grid-gap(16px) — gap-home-grid-gap
 *   - 최대 폭 main-max-w(1152px) 가운데 정렬
 */

import { BarChart3 } from "lucide-react";
import { StockSearchContainer } from "./StockSearchContainer";
import { IndicesCardContainer } from "@/components/market/IndicesCardContainer";
import { FearGreedContainer } from "./FearGreedContainer";
import { DisclosureFeedContainer } from "./DisclosureFeedContainer";

export function MarketOverviewPage() {
  return (
    <div className="w-full max-w-main-max-w mx-auto flex flex-col gap-home-grid-gap">
      {/* 페이지 타이틀 */}
      <header className="flex items-center gap-sm">
        <BarChart3
          className="h-2xl w-2xl text-accent-vivid"
          aria-hidden="true"
        />
        <h1 className="text-h1 text-text-strong">시장 종합</h1>
      </header>

      {/* 종목 검색바 — full-width */}
      <StockSearchContainer />

      {/* 주요 지수 — full-width */}
      <IndicesCardContainer />

      {/* 공포·탐욕 + 최신 공시 — 2열 그리드 (모바일: 1열) */}
      <div className="grid grid-cols-1 gap-home-grid-gap lg:grid-cols-2">
        <FearGreedContainer />
        <DisclosureFeedContainer />
      </div>
    </div>
  );
}
