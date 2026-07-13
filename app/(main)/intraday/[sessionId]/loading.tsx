/**
 * `/intraday/[sessionId]` 라우트 로딩 경계 — 즉시 스켈레톤 (nav-loading-ux).
 *
 * 배경: async(권한 판정 + params await) 라우트라 로딩 경계가 없으면 단타 목록 → 세션 상세
 * 진입 시 직전 화면이 얼어붙었다.
 *
 * 무-jump: `PaperTradingDetailContainer` 자체 `isLoading` 분기(제목 라인 + 차트 블록)와
 * **동일한 스켈레톤** — 라우트 경계 → 컨테이너 로딩 상태로 이어져도 시각 시프트 0.
 */

import { Skeleton } from "@/components/ui/Skeleton";
import { ROUTE_LOADING } from "@/lib/copy/layout/navCopy";

export default function IntradaySessionDetailLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-main-max-w flex-col gap-md"
      aria-busy="true"
    >
      <span className="sr-only">{ROUTE_LOADING}</span>
      <Skeleton variant="line" className="h-6 w-40" />
      <Skeleton variant="block" className="h-[260px] w-full rounded-lg" />
    </div>
  );
}
