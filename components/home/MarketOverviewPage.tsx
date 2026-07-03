/**
 * MarketOverviewPage — 홈(`/`) 시장 종합 대시보드(카드리스 리스킨, home-reskin).
 *
 * 노스스타 `#homeScreen` 정합 — **카드 박스 없는 화이트 포워드** 홈. 흰 바탕(`.home-surface`) 위에
 * 섹션을 헤어라인·여백으로만 구분(토스 톤). 강조면은 하단 AI 그라데이션 밴드 하나 + 공포·탐욕
 * 라이트 카드뿐. 나머지(지수 스트립·실시간 랭킹·수급·공시)는 전부 플랫.
 *
 * 서버 컴포넌트 — useState/useEffect 0. 클라이언트 경계는 각 컨테이너.
 *
 * 레이아웃(위→아래):
 *   1. StockSearchContainer — 종목 검색바(client)
 *   2. IndicesCardContainer variant="strip" — 지수 보더리스 스트립(client)
 *   3. RealtimeRankingSection — 실시간 거래량 랭킹 플랫 표(client, NEW)
 *   4. InvestorFlowTop10Card — 외국인·기관 수급 플랫 2열(client)
 *   5. 2열: FearGreedContainer(라이트 카드) · DisclosureFeedContainer(플랫 피드)
 *   6. AiAnalysisCtaBand — AI 종합분석 강조 밴드(→ /analyze)
 *
 * 화이트 배경은 **홈 라우트에만** 한정 — `(main)/layout.tsx` 가 pathname==="/" 일 때만 main 에
 * `bg-surface`(흰색)를 덮는다. 전역 main-area/surface-muted 토큰 무변경(점진 롤아웃, 다른 화면은
 * 회색+카드 유지). 본 컴포저는 폭 제한·가운데 정렬·섹션 세로 간격만 담당.
 */

import { StockSearchContainer } from "./StockSearchContainer";
import { RealtimeRankingSection } from "./RealtimeRankingSection";
import { AiAnalysisCtaBand } from "./AiAnalysisCtaBand";
import { IndicesCardContainer } from "@/components/market/IndicesCardContainer";
import { InvestorFlowTop10Card } from "@/components/flow/InvestorFlowTop10Card";
import { FearGreedContainer } from "./FearGreedContainer";
import { DisclosureFeedContainer } from "./DisclosureFeedContainer";
import { HOME_PAGE_TITLE } from "@/lib/copy/home/marketOverview";

export function MarketOverviewPage() {
  return (
    <div className="mx-auto flex w-full max-w-main-max-w flex-col gap-2xl">
      {/* 문서 아웃라인용 접근성 제목(시각 비노출 — 노스스타 홈은 페이지 타이틀 없음). */}
      <h1 className="sr-only">{HOME_PAGE_TITLE}</h1>

      {/* 종목 검색바 — 홈 진입점 */}
      <StockSearchContainer />

      {/* 주요 지수 — 보더리스 스트립 */}
      <IndicesCardContainer variant="strip" />

      {/* 실시간 거래량 랭킹 — 플랫 표 */}
      <RealtimeRankingSection />

      {/* 외국인·기관 수급 — 플랫 2열 */}
      <InvestorFlowTop10Card />

      {/* 공포·탐욕(라이트 카드) + 최신 공시(플랫 피드) — 2열(모바일 1열) */}
      <div className="grid grid-cols-1 gap-2xl lg:grid-cols-2">
        <FearGreedContainer />
        <DisclosureFeedContainer />
      </div>

      {/* AI 종합분석 — 유일한 강조 밴드 */}
      <AiAnalysisCtaBand />
    </div>
  );
}
