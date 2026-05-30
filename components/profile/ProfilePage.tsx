/**
 * ProfilePage — `/profile` 셸 컴포저 (server component).
 *
 * PR9 (finsight-redesign) 신규. home-market-redesign PR1 — "내 자산" 섹션 추가(계좌 위젯 이전).
 *
 * 책임:
 *   - 페이지 타이틀 "마이페이지" (max-w-4xl 정합 — 본 페이지는 시안의 좁은 max-w 유지).
 *   - ProfileCard 전폭 hero.
 *   - "내 자산" 섹션(AssetHero + 보유종목 전체 테이블) — ProfileCard 바로 아래(PRD §3.1, AC-2).
 *   - 2-column 그리드 (ConnectedExchangesCard + SettingsMenuCard).
 *
 * 구조 (위→아래, DESIGN.md v9 배치 순서):
 *   1. 페이지 타이틀 (`text-h1`).
 *   2. ProfileCard — hero 카드 전폭 (무변경).
 *   3. AssetSection — "내 자산"(총자산 히어로 + 자산비중 도넛 + 보유종목 전체 테이블).
 *   4. 2-column 그리드 (`md:grid-cols-2 gap-lg`):
 *      좌 = ConnectedExchangesCard, 우 = SettingsMenuCard.
 *
 * 모바일 정보 밀도 — 카드 1-column stacking. 데스크탑 (md+) — 2-column.
 *
 * 클라이언트/서버:
 *   - 본 컴포넌트 + ProfileCard/Exchanges/Settings/AssetHero 모두 server-safe (useState 0).
 *   - HoldingsTable(AssetSection 내부)만 client(정렬 상태).
 *   - page.tsx 가 mock props 전달.
 *
 * BFF 무관 — 자산 섹션은 mock 단계로 BE 호출 0건. fetch · axios 호출 0건.
 *
 * Sidebar / BottomNav 의 "마이페이지" 메뉴 활성 — `isNavItemActive("/profile", "/profile")` true.
 */

import { ProfileCard } from "./ProfileCard";
import { AssetSection } from "./AssetSection";
import { ConnectedExchangesCard } from "./ConnectedExchangesCard";
import { SettingsMenuCard } from "./SettingsMenuCard";
import type { UserProfile } from "@/lib/types/profile/user";
import type { ConnectedExchange } from "@/lib/types/profile/exchanges";
import type { ProfileMenuItem } from "@/lib/types/profile/menuItems";
import type { Portfolio } from "@/lib/types/profile/portfolio";
import type { Holding } from "@/lib/types/profile/holdings";
import { PROFILE_PAGE_TITLE } from "@/lib/copy/profile/labels";

export interface ProfilePageProps {
  user: UserProfile;
  exchanges: ConnectedExchange[];
  menuItems: ProfileMenuItem[];
  portfolio: Portfolio;
  holdings: Holding[];
}

export function ProfilePage({
  user,
  exchanges,
  menuItems,
  portfolio,
  holdings,
}: ProfilePageProps) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-lg">
      <h1 className="text-h1 text-text-strong">{PROFILE_PAGE_TITLE}</h1>
      <ProfileCard user={user} />
      <AssetSection portfolio={portfolio} holdings={holdings} />
      <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
        <ConnectedExchangesCard exchanges={exchanges} />
        <SettingsMenuCard items={menuItems} />
      </div>
    </div>
  );
}
