/**
 * StockChartSkeleton — 가격 차트(StockDailyChart)의 로딩 플레이스홀더.
 *
 * 두 곳에서 공용:
 *   1. 라우트 `loading.tsx` — RSC 페이로드 도착 전 즉시 스켈레톤(항시 티어 미러).
 *   2. `StockPageLayout` 의 `next/dynamic` 지연 로드 `loading` — recharts 청크 다운로드 전.
 *
 * ChartShell(타이틀 + 컨트롤 행 + 본문) 레이아웃을 근사해, 청크 로드 → 데이터 로드
 * (StockDailyChart 내부 `isLoading` = ChartShell + h-[480px]) → 실제 차트로 이어지는 전환에서
 * 높이 시프트를 최소화한다. 차트 본문 높이(h-[480px])는 내부 로딩 상태와 동일값.
 */

import { Skeleton } from "@/components/ui/Skeleton";
import {
  STOCK_DETAIL_PRICE_CHART_TITLE,
  STOCK_DETAIL_LOADING,
} from "@/lib/copy/profile/stockDetail";

export function StockChartSkeleton() {
  return (
    <section aria-label={STOCK_DETAIL_PRICE_CHART_TITLE} aria-busy="true">
      <span className="sr-only">{STOCK_DETAIL_LOADING}</span>
      {/* 타이틀 행 */}
      <div className="mb-sm flex items-center justify-between">
        <Skeleton variant="line" className="mb-0 h-5 w-20" />
      </div>
      {/* 컨트롤 행 — 좌측 차트타입/봉, 우측 기간 */}
      <div className="mb-md flex items-center justify-between gap-sm">
        <Skeleton variant="line" className="mb-0 h-6 w-40" />
        <Skeleton variant="line" className="mb-0 h-6 w-24" />
      </div>
      {/* 차트 본문 — 내부 로딩(h-[480px])과 동일 높이로 시프트 방지 */}
      <Skeleton variant="block" className="h-[480px] w-full rounded-md" />
    </section>
  );
}
