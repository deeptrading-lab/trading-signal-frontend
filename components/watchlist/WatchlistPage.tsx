/**
 * WatchlistPage — `/watchlist` 셸 컴포저 (client component).
 *
 * PR9(finsight-redesign) 신규 → `watchlist-real-data` §3.6 실데이터 전환.
 *
 * 책임(프레젠테이션 전용 — 데이터/상태는 `WatchlistContainer` 책임):
 *   - 페이지 헤더 (Star 아이콘 + "관심종목" + "+ 종목 추가" 버튼 → `onAdd`).
 *   - children 슬롯에 테이블/빈/에러/로딩 분기 렌더.
 *
 * v8 토큰: 컨테이너 `mx-auto max-w-main-max-w flex flex-col gap-lg` · 타이틀 `text-h1` ·
 *   Star `text-warn fill-warn` · "+ 종목 추가" `button-primary`.
 */

"use client";

import type { ReactNode } from "react";
import { Star } from "lucide-react";
import {
  WATCHLIST_PAGE_TITLE,
  WATCHLIST_ADD_GROUP,
} from "@/lib/copy/watchlist/labels";

export interface WatchlistPageProps {
  onAdd: () => void;
  children: ReactNode;
}

export function WatchlistPage({ onAdd, children }: WatchlistPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-main-max-w flex-col gap-lg">
      <div className="flex items-center justify-between">
        <h1 className="inline-flex items-center gap-sm text-h1 text-text-strong">
          <Star
            className="h-2xl w-2xl text-warn fill-warn"
            aria-hidden="true"
          />
          {WATCHLIST_PAGE_TITLE}
        </h1>
        <button type="button" className="button-primary" onClick={onAdd}>
          {WATCHLIST_ADD_GROUP}
        </button>
      </div>
      {children}
    </div>
  );
}
