/**
 * app/not-found.tsx — 루트 not-found 화면.
 *
 * PR3 (finsight-redesign) 신규.
 *
 * Next.js App Router 동작:
 *   - 매칭되는 라우트 segment 가 없는 URL 진입 시 본 파일이 트리거. (main) 셸 외부.
 *   - segment 안 `notFound()` 호출은 해당 segment 의 `not-found.tsx` 우선 → `(main)/not-found.tsx`.
 *
 * PR3 시점 — `/dashboard`, `/analyze`, `/market`, `/watchlist`, `/profile` 5 라우트가 미존재.
 * 사이드바·바텀nav 의 6 메뉴 클릭 → 본 루트 not-found 가 안내 화면을 노출. 후속 PR (PR5~PR9)
 * 에서 각 화면이 채워지면 자연 무력화.
 *
 * Header / Sidebar / BottomNav 없는 단독 화면 — 사용자가 홈으로 빠르게 돌아갈 수 있도록 CTA 강조.
 */

import Link from "next/link";
import {
  NOT_FOUND_TITLE,
  NOT_FOUND_DESCRIPTION,
  NOT_FOUND_HOME_CTA,
} from "@/lib/copy/layout/navCopy";

export default function RootNotFound() {
  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center p-lg">
      <div className="card-hero text-center flex flex-col items-center gap-md max-w-[480px]">
        <h1 className="text-h1 text-text-strong">{NOT_FOUND_TITLE}</h1>
        <p className="text-body-md text-text-muted">{NOT_FOUND_DESCRIPTION}</p>
        <Link href="/" className="button-primary inline-flex items-center justify-center no-underline">
          {NOT_FOUND_HOME_CTA}
        </Link>
      </div>
    </div>
  );
}
