/**
 * ProfilePage — `/profile` 셸 컴포저 (server component).
 *
 * profile-real-data — mock 3종(총자산 히어로·자산비중 도넛·보유종목 표 / 연동 거래소)을 삭제했다.
 *   실계좌·거래소 연동은 원천이 없고(조회·분석 전용 스코프) 만들 계획도 없어, 가짜 숫자를
 *   진짜처럼 보여주는 대신 **계정에 실제로 있는 데이터**로 지면을 채운다.
 *
 * 구조 (위→아래):
 *   1. sr-only 페이지 타이틀(문서 아웃라인용 h1).
 *   2. ProfileCard — 아이덴티티 헤더(profiles 테이블 실데이터).
 *   3. 2-column 그리드: 좌 = 내 분석(계정별 AI 판정) + 내 종목(관심·최근), 우 = 설정 (+ admin 메뉴).
 *
 * 카드리스 화이트 포워드 유지 — 흰 바탕 위 섹션을 여백(`gap-2xl`)으로만 구분.
 * 모바일 1-column stacking, 데스크탑(md+) 2-column.
 *
 * 클라이언트/서버: 본 컴포넌트 + ProfileCard/Settings 는 server. 요약 2종만 client
 *   (MyAnalysisSummary = TanStack Query, MyStocksSummary = localStorage).
 */

import { ProfileCard } from "./ProfileCard";
import { MyAnalysisSummary } from "./MyAnalysisSummary";
import { MyStocksSummary } from "./MyStocksSummary";
import { SettingsMenuCard } from "./SettingsMenuCard";
import type { ProfileMenuItem } from "@/lib/types/profile/menuItems";
import type { Profile } from "@/lib/types/auth/profile";
import {
  PROFILE_PAGE_TITLE,
  ADMIN_MENU_SECTION_TITLE,
} from "@/lib/copy/profile/labels";

export interface ProfilePageProps {
  profile: Profile;
  /** 설정 섹션 항목(모든 유저). */
  menuItems: ProfileMenuItem[];
  /** 관리자 메뉴 항목(admin 이상) — 있으면 "관리자 메뉴" 섹션을 설정 아래 렌더. 일반 유저는 undefined. */
  adminItems?: ProfileMenuItem[];
}

export function ProfilePage({ profile, menuItems, adminItems }: ProfilePageProps) {
  return (
    <div className="mx-auto flex w-full max-w-main-max-w flex-col gap-2xl">
      {/* 문서 아웃라인용 접근성 제목(시각 비노출 — 아이덴티티 헤더가 페이지 헤더 역할, 홈 정합). */}
      <h1 className="sr-only">{PROFILE_PAGE_TITLE}</h1>
      <ProfileCard profile={profile} />
      <div className="grid grid-cols-1 gap-2xl md:grid-cols-2">
        <div className="flex flex-col gap-2xl">
          <MyAnalysisSummary />
          <MyStocksSummary />
        </div>
        {/* 우측 열 — 설정 + (admin 이상) 관리자 메뉴 스택. */}
        <div className="flex flex-col gap-2xl">
          <SettingsMenuCard items={menuItems} />
          {adminItems && adminItems.length > 0 ? (
            <SettingsMenuCard title={ADMIN_MENU_SECTION_TITLE} items={adminItems} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
