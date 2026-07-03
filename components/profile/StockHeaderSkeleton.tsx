/**
 * StockHeaderSkeleton — 시세 헤더(StockHeader)의 로딩 플레이스홀더.
 *
 * `StockHeader` 의 `isLoading` 분기와 라우트 `loading.tsx`(즉시 스켈레톤)가 **같은 마크업**을
 * 공유하도록 추출 — 라우트 로딩 경계 → 컴포넌트 로딩 상태 전환 시 시각 시프트(jump) 0.
 * hook·상태 없는 순수 프레젠테이션이라 서버 컴포넌트(loading.tsx)에서도 그대로 렌더된다.
 */

import { Skeleton } from "@/components/ui/Skeleton";
import { STOCK_DETAIL_LOADING } from "@/lib/copy/profile/stockDetail";

export function StockHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-md" aria-busy="true">
      <span className="sr-only">{STOCK_DETAIL_LOADING}</span>
      <Skeleton variant="line" className="mb-0 h-6 w-40" />
      <Skeleton variant="line" className="mb-0 h-10 w-56" />
    </div>
  );
}
