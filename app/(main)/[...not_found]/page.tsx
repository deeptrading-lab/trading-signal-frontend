/**
 * (main)/[...not_found]/page.tsx — (main) 그룹 안 미존재 라우트를 not-found 로 라우팅.
 *
 * Next.js App Router 동작:
 *   - `/market` 같은 path 가 `app/(main)/market/page.tsx` 부재 시 라우트 매칭 실패 → root
 *     `app/not-found.tsx` 로 fallback (사이드바 없는 전체 화면).
 *   - 본 catch-all segment 가 그 갭을 메움 — `(main)/` 안 미존재 path 가 본 page 로 매칭 →
 *     `notFound()` 호출 → `(main)/not-found.tsx` 트리거 → `(main)/layout.tsx` 셸 (Sidebar /
 *     Header / BottomNav) 안에서 not-found 렌더.
 *   - 구체적 라우트 (`/dashboard`, `/analyze`, 후속 `/market` 등) 가 본 catch-all 보다 우선
 *     매칭 — 후속 PR8/PR9 에서 페이지 신설 시 본 catch-all 자연 무력화 (해당 path 한정).
 *   - 시리즈 종료 후 모든 6 메뉴 page.tsx 정착 시점에 본 파일 cleanup 검토.
 */

import { notFound } from "next/navigation";

export default function NotFoundCatchAll() {
  notFound();
}
