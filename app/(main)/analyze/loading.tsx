/**
 * `/analyze` 라우트 로딩 경계 — 즉시 스켈레톤 (nav-loading-ux).
 *
 * 배경: 이 라우트는 async(권한 판정 `hasServerRole` await)라 로딩 경계가 없으면 BottomNav
 * 탭을 눌러도 RSC 응답까지 직전 화면이 얼어붙는다(`stock/[ticker]/loading.tsx` 와 동일 패턴).
 * 내부 Suspense 는 `fallback={null}`(useSearchParams 요구) 이라 라우트 경계가 첫 페인트를 담당.
 *
 * 무-jump: 컨테이너 폭·간격은 page.tsx(`max-w-main-max-w`·`gap-lg`), 카드 행 스켈레톤은
 * `AIDecisionListContainer.ResultsSkeleton` 과 동일 구조(원형 아바타 + 2줄, 헤어라인 행) 미러.
 * 권한 거부(AccessDeniedView) 도 이 스켈레톤 뒤에 뜬다 — 프리즈보단 낫다(계획 합의).
 */

import { Skeleton } from "@/components/ui/Skeleton";
import { ROUTE_LOADING } from "@/lib/copy/layout/navCopy";

export default function AnalyzeLoading() {
  return (
    <div
      className="mx-auto w-full max-w-main-max-w flex flex-col gap-lg"
      aria-busy="true"
    >
      <span className="sr-only">{ROUTE_LOADING}</span>

      {/* 상위 탭 줄 자리 — SegmentedTabs(pill) 근사 */}
      <Skeleton variant="block" className="h-9 w-44 rounded-pill" />

      {/* 분석 결과 카드 리스트 — ResultsSkeleton(플랫 헤어라인 행) 미러 */}
      <div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-md border-b border-border-line py-md last:border-b-0"
            aria-hidden="true"
          >
            <Skeleton variant="line" className="mb-0 h-8 w-8 rounded-full" />
            <div className="flex flex-1 flex-col gap-xs">
              <Skeleton variant="line" className="mb-0 h-4 w-1/3" />
              <Skeleton variant="line" className="mb-0 h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
