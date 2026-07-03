/**
 * app/not-found.tsx — 루트 not-found 화면(글로벌 셸 밖).
 *
 * Next.js App Router 동작:
 *   - 매칭되는 라우트 segment 가 없는 URL 진입 시 본 파일이 트리거(`(main)` 셸 외부 — Header/
 *     Sidebar/BottomNav 없음). `(main)/` 안 미존재 path 는 catch-all → `(main)/not-found` 우선.
 *
 * polish-login-404 리스킨:
 *   - 셸 밖 화면이라 자체 클린 표면(`bg-surface`, 다크 세이프)을 깔고 중앙 정렬한다(로그인과 동일 톤).
 *   - 본문·카피·CTA 는 `NotFoundView` 로 셸 내부 404 와 단일화 — 두 화면 시각 일관성 보장.
 */

import { NotFoundView } from "@/components/layout/NotFoundView";

export default function RootNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface px-lg py-2xl">
      <NotFoundView />
    </main>
  );
}
