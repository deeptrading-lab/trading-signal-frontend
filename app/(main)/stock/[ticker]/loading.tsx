/**
 * `/stock/[ticker]` 라우트 로딩 경계 — 즉시 스켈레톤(stock-route-perf 성능 개선 #1).
 *
 * 배경: 이 라우트는 dynamic(page.tsx 가 `searchParams` 를 await)인데 로딩 경계가 없어,
 *   `router.push` 시 RSC 페이로드가 돌아올 때까지 **직전 화면이 얼어붙어** 아무것도 안 그려졌다
 *   (모바일 체감 1~2s 지연). 본 `loading.tsx` 가 항시 티어(시세 헤더 · 가격 차트 · 시그널 요약)를
 *   미러한 스켈레톤을 즉시 페인트해 빈 대기를 없앤다.
 *
 * 무-jump: 컨테이너·섹션 헤어라인·간격을 `StockProfilePage` / `StockPageLayout` 와 동일하게 맞추고,
 *   헤더·시그널 스켈레톤은 각 컴포넌트의 `isLoading` 분기와 **같은 스켈레톤 컴포넌트**를 쓴다 →
 *   로딩 경계 → 컴포넌트 로딩 상태로 이어지는 전환에서 시각 시프트가 없다.
 *
 * 서버 컴포넌트 — hook/상태 없는 정적 스켈레톤. `(main)` 레이아웃(사이드바·헤더·바텀nav)은 유지되고
 * 이 스켈레톤은 페이지 슬롯만 채운다.
 */

import { Skeleton } from "@/components/ui/Skeleton";
import { StockHeaderSkeleton } from "@/components/profile/StockHeaderSkeleton";
import { StockChartSkeleton } from "@/components/profile/StockChartSkeleton";
import { SignalSummarySkeleton } from "@/components/profile/SignalSummarySkeleton";
import { STOCK_DETAIL_LOADING } from "@/lib/copy/profile/stockDetail";

export default function StockDetailLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-main-max-w flex-col gap-2xl"
      aria-busy="true"
    >
      <span className="sr-only">{STOCK_DETAIL_LOADING}</span>

      {/* 검색바 자리 — StockSearchContainer(h-14) 높이 근사로 상단 무-jump */}
      <Skeleton variant="block" className="h-14 w-full rounded-md" />

      {/* 항시 티어 미러 — StockPageLayout 구조/헤어라인/간격 정합 */}
      <div className="flex flex-col">
        <StockHeaderSkeleton />
        <div className="mt-lg border-t border-border-line pt-lg">
          <StockChartSkeleton />
        </div>
        <div className="mt-lg border-t border-border-line pt-lg">
          <SignalSummarySkeleton />
        </div>
      </div>
    </div>
  );
}
