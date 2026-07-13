/**
 * `/intraday` 라우트 로딩 경계 — 즉시 스켈레톤 (nav-loading-ux).
 *
 * 배경: async(권한 판정 await) 라우트인데 로딩 경계가 없어 BottomNav "AI 단타" 탭 클릭 후
 * 직전 화면이 얼어붙었다(`stock/[ticker]/loading.tsx` 와 동일 패턴의 복제).
 *
 * 무-jump: `IntradayWatchWorkspace` 첫 화면 구조(오토파일럿 컨트롤 행 → 워치 검색바 →
 * 추천 칩 2줄 → 날짜 그룹 표)를 블록 단위로 미러.
 */

import { Skeleton } from "@/components/ui/Skeleton";
import { ROUTE_LOADING } from "@/lib/copy/layout/navCopy";

export default function IntradayLoading() {
  return (
    <div
      className="mx-auto w-full max-w-main-max-w flex flex-col gap-lg"
      aria-busy="true"
    >
      <span className="sr-only">{ROUTE_LOADING}</span>

      {/* 오토파일럿 컨트롤 행 자리 */}
      <Skeleton variant="line" className="mb-0 h-6 w-48" />

      {/* 워치 검색바 자리 */}
      <Skeleton variant="block" className="h-14 w-full rounded-md" />

      {/* 수급/거래량 추천 칩 2줄 자리 */}
      <div className="flex flex-col gap-sm">
        <Skeleton variant="line" className="mb-0 h-7 w-2/3 rounded-pill" />
        <Skeleton variant="line" className="mb-0 h-7 w-1/2 rounded-pill" />
      </div>

      {/* 날짜 그룹 헤더 + 워치 표 행 자리(헤어라인 행) */}
      <div className="flex flex-col">
        <Skeleton variant="line" className="mb-sm h-5 w-32" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-md border-b border-border-line py-md last:border-b-0"
            aria-hidden="true"
          >
            <Skeleton variant="line" className="mb-0 h-4 w-1/4" />
            <Skeleton variant="line" className="mb-0 ml-auto h-4 w-16" />
            <Skeleton variant="line" className="mb-0 h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
