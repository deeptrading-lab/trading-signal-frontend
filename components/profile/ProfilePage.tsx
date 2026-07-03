/**
 * ProfilePage — `/profile` 셸 컴포저 (server component).
 *
 * PR9 (finsight-redesign) → home-market-redesign PR1 → **profile-reskin**(카드리스 화이트 포워드).
 *
 * profile-reskin — 노스스타 홈(`MarketOverviewPage`) 정합. 흰 바탕(`(main)/layout.tsx` 가 `/profile`
 *   한정 surface 덮음) 위에 섹션을 여백(`gap-2xl`)으로만 구분한다. 페이지 타이틀은 `sr-only`
 *   (아이덴티티 헤더가 시각 헤더 역할 — 홈이 검색바를 헤더로 두는 것과 동일 톤). 라이트 카드는
 *   "내 자산" 히어로(`asset-hero`) **하나만** — 나머지(보유종목·연동 거래소·설정)는 전부 플랫.
 *
 * 구조 (위→아래):
 *   1. sr-only 페이지 타이틀(문서 아웃라인용 h1).
 *   2. ProfileCard — 아이덴티티 헤더(카드리스 평탄 밴드).
 *   3. AssetSection — "내 자산"(총자산 히어로 라이트 카드 + 자산비중 도넛 + 보유종목 플랫 표).
 *   4. 2-column 그리드 (`md:grid-cols-2 gap-2xl`): 좌 = 연동 거래소, 우 = 설정. 둘 다 플랫 섹션.
 *
 * 모바일 — 1-column stacking. 데스크탑 (md+) — 2-column.
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
    <div className="mx-auto flex w-full max-w-main-max-w flex-col gap-2xl">
      {/* 문서 아웃라인용 접근성 제목(시각 비노출 — 아이덴티티 헤더가 페이지 헤더 역할, 홈 정합). */}
      <h1 className="sr-only">{PROFILE_PAGE_TITLE}</h1>
      <ProfileCard user={user} />
      <AssetSection portfolio={portfolio} holdings={holdings} />
      <div className="grid grid-cols-1 gap-2xl md:grid-cols-2">
        <ConnectedExchangesCard exchanges={exchanges} />
        <SettingsMenuCard items={menuItems} />
      </div>
    </div>
  );
}
