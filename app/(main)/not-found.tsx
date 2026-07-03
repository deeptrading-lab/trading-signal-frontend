/**
 * (main)/not-found.tsx — 미존재 라우트 안내 화면(글로벌 셸 내부).
 *
 * `(main)/[...not_found]` catch-all 이 `notFound()` 호출 → 본 not-found 가 `(main)/layout.tsx`
 * 셸(Sidebar / Header / BottomNav) 안에서 렌더. 구체 라우트가 정착한 현재는 실제로 존재하지 않는
 * URL 진입 시에만 트리거 → 일반 404 안내.
 *
 * polish-login-404 리스킨:
 *   - 본문·카피·CTA 는 루트 404 와 동일한 `NotFoundView` 로 단일화(카드리스 중앙 정렬).
 *   - 셸 안이라 사이드 메뉴 이동도 가능하지만, 루트 404 와의 일관성을 위해 "홈으로" CTA 를 함께 노출.
 */

import { NotFoundView } from "@/components/layout/NotFoundView";

export default function MainNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-main-max-w flex-col items-center justify-center py-2xl">
      <NotFoundView />
    </div>
  );
}
