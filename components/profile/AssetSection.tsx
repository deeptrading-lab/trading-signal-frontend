/**
 * AssetSection — `/profile` "내 자산" 섹션 컴포저.
 *
 * home-market-redesign PR1 — 계좌 위젯 `/dashboard` → `/profile` 이전(PRD §3.1).
 *
 * 구조(DESIGN.md v9 배치 순서):
 *   "내 자산" 섹션 타이틀(h1) → AssetHero(총자산 + 도넛) → HoldingsTable(보유종목 전체 테이블).
 *
 * 배치: ProfilePage 가 ProfileCard 바로 아래에 본 섹션을 둔다(가장 중요한 개인 데이터).
 * server-safe(useState 0) — HoldingsTable 만 client(정렬 상태).
 */

import { AssetHero } from "./AssetHero";
import { HoldingsTable } from "./HoldingsTable";
import type { Portfolio } from "@/lib/types/profile/portfolio";
import type { Holding } from "@/lib/types/profile/holdings";
import { ASSET_SECTION_TITLE } from "@/lib/copy/profile/labels";

export interface AssetSectionProps {
  portfolio: Portfolio;
  holdings: Holding[];
}

export function AssetSection({ portfolio, holdings }: AssetSectionProps) {
  // 도넛 가운데 "N 자산" — 보유종목의 서로 다른 자산 종류 수(주식/코인).
  const assetCount = new Set(holdings.map((h) => h.assetType)).size;

  return (
    <section className="flex flex-col gap-lg" aria-label={ASSET_SECTION_TITLE}>
      <h2 className="text-h1 text-text-strong">{ASSET_SECTION_TITLE}</h2>
      <AssetHero portfolio={portfolio} assetCount={assetCount} />
      <HoldingsTable holdings={holdings} />
    </section>
  );
}
