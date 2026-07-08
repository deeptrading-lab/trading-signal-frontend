/**
 * WatchlistPage — `/watchlist` 셸 컴포저 (client component).
 *
 * PR9(finsight-redesign) → `watchlist-real-data` §3.6 → **watchlist-reskin**(카드리스 화이트 포워드).
 *
 * 책임(프레젠테이션 전용 — 데이터/상태·검색·새로고침은 `WatchlistContainer` 책임):
 *   - 시각 페이지 타이틀 제거(전 페이지 공통 — 홈 정합). 문서 아웃라인용 `h1` 만 sr-only 로 유지.
 *   - children 슬롯에 검색(+새로고침 인라인)/표/빈/에러/로딩 분기 렌더.
 */

"use client";

import type { ReactNode } from "react";
import { WATCHLIST_PAGE_TITLE } from "@/lib/copy/watchlist/labels";

export interface WatchlistPageProps {
  children: ReactNode;
}

export function WatchlistPage({ children }: WatchlistPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-main-max-w flex-col gap-lg">
      {/* 문서 아웃라인용 접근성 제목(항상 sr-only) — 시각 타이틀은 전 페이지 공통 제거. */}
      <h1 className="sr-only">{WATCHLIST_PAGE_TITLE}</h1>
      {children}
    </div>
  );
}
