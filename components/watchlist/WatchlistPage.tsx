/**
 * WatchlistPage — `/watchlist` 셸 컴포저 (client component).
 *
 * PR9(finsight-redesign) 신규 → `watchlist-real-data` §3.6 실데이터 전환.
 *
 * 책임(프레젠테이션 전용 — 데이터/상태는 `WatchlistContainer` 책임):
 *   - 페이지 헤더 (Star 아이콘 + "관심종목" + "새로고침"/"+ 종목 추가" 버튼).
 *   - children 슬롯에 테이블/빈/에러/로딩 분기 렌더.
 *
 * `watchlist-batch-quotes` §3.4 — 상단 단일 "새로고침" 신설:
 *   - per-row 재시도(전체 refetch 오해) 를 헤더 단일 버튼으로 일원화. `onRefresh` = `query.refetch()`.
 *   - `isRefreshing`(query.isFetching) 동안 비활성 + 아이콘 스핀. 깜박임은 훅의 placeholderData 가 흡수.
 *   - `canRefresh` false(빈 상태 등) 시 버튼 미노출.
 *
 * v8 토큰: 컨테이너 `mx-auto max-w-main-max-w flex flex-col gap-lg` · 타이틀 `text-h1` ·
 *   Star `text-warn fill-warn` · "새로고침" = **배경 투명** 아이콘 버튼(RefreshCw 만, 박스 없이 —
 *   종목추가와 크기 착시 회피, hover 시 아이콘 색만 진해짐, aria-label 로 접근성) · "+ 종목 추가" `button-primary`.
 */

"use client";

import type { ReactNode } from "react";
import { Star, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  WATCHLIST_PAGE_TITLE,
  WATCHLIST_ADD_GROUP,
  WATCHLIST_REFRESH,
  WATCHLIST_REFRESHING,
} from "@/lib/copy/watchlist/labels";

export interface WatchlistPageProps {
  onAdd: () => void;
  /** 상단 새로고침 — 전체 query refetch. */
  onRefresh: () => void;
  /** refetch 진행 중(query.isFetching) — 버튼 비활성 + 아이콘 스핀. */
  isRefreshing?: boolean;
  /** 새로고침 노출 여부 — 빈 상태/tickers 0 일 땐 false. */
  canRefresh?: boolean;
  children: ReactNode;
}

export function WatchlistPage({
  onAdd,
  onRefresh,
  isRefreshing = false,
  canRefresh = false,
  children,
}: WatchlistPageProps) {
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
        <div className="flex items-center gap-sm">
          {canRefresh ? (
            <button
              type="button"
              className="inline-flex items-center justify-center h-button-sm-h w-button-sm-h rounded-sm bg-transparent text-text-muted hover:text-text-strong transition-colors cursor-pointer disabled:opacity-[0.65] disabled:cursor-not-allowed"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label={isRefreshing ? WATCHLIST_REFRESHING : WATCHLIST_REFRESH}
            >
              <RefreshCw
                className={cn("h-5 w-5", isRefreshing && "animate-spin")}
                aria-hidden="true"
              />
            </button>
          ) : null}
          <button type="button" className="button-primary" onClick={onAdd}>
            {WATCHLIST_ADD_GROUP}
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}
