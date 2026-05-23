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
 *   - 좌측: FinSight wordmark (Activity 로고 + 텍스트, font-display + text-accent-vivid)
 *   - 우측: 프로필 아이콘 (모든 뷰포트 공통, 데스크탑·모바일 동일 노출)
 *
 * 데스크탑은 Sidebar 가 좌측을 점유하므로 wordmark 도 sidebar 폭 안에 정렬 — 본 PR3 의
 * 단순화: Header 전폭에서 좌측 정렬, sidebar 내부 brand 와 시각 중복 없도록 sidebar 가
 * brand 영역을 흡수하고 데스크탑에선 Header 의 wordmark 를 숨김 (`lg:hidden`).
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

export function Header() {
  return (
    <header className="header-glass sticky top-0 z-[50]">
      {/* 좌측 wordmark — 데스크탑에서는 사이드바 brand 영역과 시각 중복 회피 (lg:hidden). */}
      <Link
        href="/"
        className="header-brand lg:invisible"
        aria-label={NAV_BRAND_LABEL}
      >
        <Activity className="header-brand-icon" aria-hidden="true" />
        <span className="header-brand-text">{NAV_BRAND_LABEL}</span>
      </Link>
      {/* 우측 프로필 아이콘 — PR3 에서는 라우팅만 (`/profile` 미존재 → not-found). */}
      <Link
        href="/profile"
        className="header-profile-button"
        aria-label={HEADER_PROFILE_ARIA}
      >
        <User aria-hidden="true" />
      </Link>
    </header>
  );
}
