/**
 * `/profile` 라우트 로딩 경계 — 즉시 스켈레톤 (nav-loading-ux).
 *
 * 배경: `cookies()` + 세션 판독으로 요청별 동적 렌더 라우트인데 로딩 경계가 없어 BottomNav
 * "마이페이지" 탭 클릭 후 직전 화면이 얼어붙었다.
 *
 * 무-jump: `ProfilePage` 첫 화면 구조(hero: 아바타+이름 → "내 자산" 블록 → md 2-column
 * 그리드)를 컨테이너 폭·간격(`max-w-main-max-w`·`gap-2xl`) 그대로 미러.
 */

import { Skeleton } from "@/components/ui/Skeleton";
import { ROUTE_LOADING } from "@/lib/copy/layout/navCopy";

export default function ProfileLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-main-max-w flex-col gap-2xl"
      aria-busy="true"
    >
      <span className="sr-only">{ROUTE_LOADING}</span>

      {/* ProfileCard hero — 아바타 + 이름/이메일 2줄 */}
      <div className="flex items-center gap-md" aria-hidden="true">
        <Skeleton variant="line" className="mb-0 h-14 w-14 rounded-full" />
        <div className="flex flex-1 flex-col gap-xs">
          <Skeleton variant="line" className="mb-0 h-5 w-32" />
          <Skeleton variant="line" className="mb-0 h-4 w-48" />
        </div>
      </div>

      {/* "내 자산" 섹션 자리 */}
      <Skeleton variant="block" className="h-40 w-full rounded-lg" />

      {/* 연결 거래소(좌) + 설정(우) 2-column 그리드 자리 */}
      <div className="grid grid-cols-1 gap-2xl md:grid-cols-2" aria-hidden="true">
        <Skeleton variant="block" className="h-48 w-full rounded-lg" />
        <Skeleton variant="block" className="h-48 w-full rounded-lg" />
      </div>
    </div>
  );
}
