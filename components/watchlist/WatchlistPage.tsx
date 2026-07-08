/**
 * WatchlistPage — `/watchlist` 셸 컴포저 (client component).
 *
 * PR9(finsight-redesign) → `watchlist-real-data` §3.6 → **watchlist-reskin**(카드리스 화이트 포워드).
 *
 * 책임(프레젠테이션 전용 — 데이터/상태는 `WatchlistContainer` 책임):
 *   - 플랫 헤더 (Star 아이콘 + "관심 종목" 제목 + "새로고침" 아이콘 버튼). **카드 박스 없음.**
 *   - children 슬롯에 검색/표/빈/에러/로딩 분기 렌더.
 *
 * watchlist-reskin — 홈 랭킹(`RealtimeRankingSection`) 정합:
 *   - 제목은 페이지 `<h1>` 을 유지하되 `text-h2` 로 렌더 → 홈 섹션 제목("실시간")과 같은 시각 밀도.
 *     (셸에 페이지 h1 이 없어 문서 아웃라인상 h1 이 필요 → 시맨틱 h1 + 컴팩트 h2 크기.)
 *     `Section` 원자는 제목을 h2 로 고정하므로 헤더는 평탄 flex 로 직접 구성하고, 본문 목록은
 *     `ListRow`/`Divider` 원자(`WatchlistTable`)로 카드리스 렌더한다.
 *   - Star = `text-chart-signal fill-chart-signal`(앰버/골드 — 사이드바 관심종목 아이콘·검색 별과 통일).
 *   - "새로고침" = 배경 투명 아이콘 버튼(RefreshCw). `isRefreshing` 동안 비활성 + 스핀.
 *     `canRefresh` false(빈/초기 로딩/전체 에러) 시 미노출.
 */

"use client";

import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  WATCHLIST_PAGE_TITLE,
  WATCHLIST_REFRESH,
  WATCHLIST_REFRESHING,
} from "@/lib/copy/watchlist/labels";

export interface WatchlistPageProps {
  /** 상단 새로고침 — 전체 query refetch. */
  onRefresh: () => void;
  /** refetch 진행 중(query.isFetching) — 버튼 비활성 + 아이콘 스핀. */
  isRefreshing?: boolean;
  /** 새로고침 노출 여부 — 빈 상태/tickers 0 일 땐 false. */
  canRefresh?: boolean;
  children: ReactNode;
}

export function WatchlistPage({
  onRefresh,
  isRefreshing = false,
  canRefresh = false,
  children,
}: WatchlistPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-main-max-w flex-col gap-lg">
      {/* 문서 아웃라인용 접근성 제목(항상 sr-only) — 시각 타이틀은 전 페이지 공통 제거(홈 정합).
       *  검색이 상단 패딩에 바로 붙는다. 새로고침은 md+ 에서만 우측 상단에 유지(모바일=pull-to-refresh). */}
      <h1 className="sr-only">{WATCHLIST_PAGE_TITLE}</h1>
      {canRefresh ? (
        <div className="hidden md:flex justify-end">
          <button
            type="button"
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-sm bg-transparent text-text-muted transition-colors hover:text-text-strong disabled:cursor-not-allowed disabled:opacity-[0.65]"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label={isRefreshing ? WATCHLIST_REFRESHING : WATCHLIST_REFRESH}
          >
            <RefreshCw
              className={cn("h-5 w-5", isRefreshing && "animate-spin")}
              aria-hidden="true"
            />
          </button>
        </div>
      ) : null}
      {children}
    </div>
  );
}
