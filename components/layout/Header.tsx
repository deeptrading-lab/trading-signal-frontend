/**
 * Header — finsight 글로벌 셸 상단 글래스 헤더.
 *
 * PR3 (finsight-redesign) 신규. PRD §3.3 / §5.3 AC-L-2.
 *
 * 위치: 모든 라우트에서 sticky top, height `spacing.navbar-h` (60px).
 * 스타일: `header-glass` 합성 토큰 (`@layer components` in app/components.css)
 *         backdrop-blur + bg-surface/80 + border-b border-border-line.
 *
 * 내부 배치:
 *   - 좌측: FinSight wordmark (모바일 전용 — `lg:hidden`. 데스크탑은 Sidebar 가 brand 호스트).
 *   - 가운데~우측 (데스크탑 한정 `hidden lg:flex`): 글로벌 마켓 티커 5종 — `HeaderMarketTicker` 컨테이너.
 *   - 우측 끝: 프로필 아이콘 (모든 뷰포트 공통).
 *
 * PR6 fix (사용자 dev 실측):
 *   - 좌측 wordmark `lg:invisible` → `lg:hidden` (자리도 차지하지 않음).
 *   - 데스크탑 글로벌 마켓 티커 추가 — 시안 KOSPI / NASDAQ / BTC 3 건 정합.
 *
 * header-market-ticker PRD (§3.5 / §9 q4):
 *   - mock 3건 직접 import 제거 → 티커 부분을 client 컨테이너 `HeaderMarketTicker` 로 분리.
 *     컨테이너가 `useQueryMarketTicker()` 로 실데이터 5종(코스피·코스닥·S&P500·NASDAQ·BTC)을 조달.
 *   - Header 는 셸·wordmark·프로필만 책임. `"use client"` 유지(Header server 화는 비범위).
 *
 * ARIA: `<header role="banner">` 자동 적용.
 */

"use client";

import Link from "next/link";
import { Activity, User } from "lucide-react";
import {
  NAV_BRAND_LABEL,
  HEADER_PROFILE_ARIA,
} from "@/lib/copy/layout/navCopy";
import { HeaderMarketTicker } from "./HeaderMarketTicker";

export function Header() {
  return (
    <header className="header-glass sticky top-0 z-[50]">
      {/* 좌측 wordmark — 모바일 전용. 데스크탑(`>= lg`)에서는 Sidebar 가 brand 호스트이므로
       *  자리도 차지하지 않도록 `lg:hidden` (이전 `lg:invisible` → 자리 차지 회귀 수정). */}
      <Link
        href="/"
        className="header-brand lg:hidden"
        aria-label={NAV_BRAND_LABEL}
      >
        <Activity className="header-brand-icon" aria-hidden="true" />
        <span className="header-brand-text">{NAV_BRAND_LABEL}</span>
      </Link>
      <div className="flex items-center gap-lg ml-auto">
        {/* 글로벌 마켓 티커 (데스크탑 한정 `hidden lg:flex`) — 실데이터 5종 client 컨테이너. */}
        <HeaderMarketTicker />
        {/* 우측 프로필 아이콘 — PR3 에서는 라우팅만 (`/profile` 미존재 → not-found). */}
        <Link
          href="/profile"
          className="header-profile-button"
          aria-label={HEADER_PROFILE_ARIA}
        >
          <User aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
