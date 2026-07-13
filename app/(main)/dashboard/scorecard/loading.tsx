/**
 * `/dashboard/scorecard` 라우트 로딩 경계 — 즉시 스켈레톤 (nav-loading-ux).
 *
 * async(권한 판정 await) 라우트 프리즈 방지. 운영자 내부 뷰라 최소 폴리시 —
 * 타이틀/부제 라인 + 표 블록만 미러(page.tsx 의 header 구조 정합).
 */

import { Skeleton } from "@/components/ui/Skeleton";
import { ROUTE_LOADING } from "@/lib/copy/layout/navCopy";

export default function ScorecardLoading() {
  return (
    <div
      className="mx-auto w-full max-w-main-max-w flex flex-col gap-lg"
      aria-busy="true"
    >
      <span className="sr-only">{ROUTE_LOADING}</span>
      <div className="flex flex-col gap-xs" aria-hidden="true">
        <Skeleton variant="line" className="mb-0 h-7 w-44" />
        <Skeleton variant="line" className="mb-0 h-4 w-72" />
      </div>
      <Skeleton variant="block" className="h-64 w-full rounded-md" />
    </div>
  );
}
