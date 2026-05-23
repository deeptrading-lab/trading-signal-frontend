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
 *   - 가운데~우측 (데스크탑 한정 `hidden lg:flex`): 글로벌 마켓 티커 KOSPI / NASDAQ / BTC.
 *   - 우측 끝: 프로필 아이콘 (모든 뷰포트 공통).
 *
 * PR6 fix (사용자 dev 실측):
 *   - 좌측 wordmark `lg:invisible` → `lg:hidden` (자리도 차지하지 않음).
 *   - 데스크탑 글로벌 마켓 티커 추가 — 시안 (`Stock and Coin Analysis App/src/app/components/
 *     Header.tsx`) 의 KOSPI / NASDAQ / BTC 3 건 정합. 색상은 한국식 등락 토큰
 *     (`text-signal-up` red / `text-signal-down` blue) 으로 매핑.
 *
 * ARIA: `<header role="banner">` 자동 적용.
 */

"use client";

import { Fragment } from "react";
import Link from "next/link";
import { Activity, User } from "lucide-react";
import {
  NAV_BRAND_LABEL,
  HEADER_PROFILE_ARIA,
} from "@/lib/copy/layout/navCopy";
import { HEADER_MARKET_TICKERS } from "@/lib/mock/layout/marketTickers";
import { cn } from "@/lib/utils/cn";

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
        {/* 글로벌 마켓 티커 (데스크탑 한정) — KOSPI / NASDAQ / BTC mock. */}
        <div
          className="hidden lg:flex items-center gap-lg text-caption"
          aria-label="글로벌 마켓 시세"
        >
          {HEADER_MARKET_TICKERS.map((t, i) => (
            <Fragment key={t.code}>
              {i > 0 && (
                <span className="w-px h-3 bg-border-line" aria-hidden="true" />
              )}
              <div className="flex items-center gap-sm">
                <span className="text-text-muted">{t.code}</span>
                <span className="text-body-sm-strong text-text-strong tabular-nums">
                  {t.value}
                </span>
                <span
                  className={cn(
                    "tabular-nums",
                    t.isUp ? "text-signal-up" : "text-signal-down",
                  )}
                >
                  {t.isUp ? "▲" : "▼"} {Math.abs(t.changePct).toFixed(1)}%
                </span>
              </div>
            </Fragment>
          ))}
        </div>
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
