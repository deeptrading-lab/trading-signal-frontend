/**
 * (main)/not-found.tsx — 미존재 라우트 안내 화면.
 *
 * PR3 (finsight-redesign) 신규. PR #34 chore — `[...not_found]` catch-all 도입 후 본 not-found
 * 가 `(main)/layout.tsx` 셸 (Sidebar / Header / BottomNav) 안에서 렌더 → 사용자는 사이드 메뉴
 * 로 다른 화면 이동 가능 → 홈 CTA 제거.
 *
 * 본 시점에 `/market`, `/watchlist`, `/profile` 3 라우트 미존재. 사이드바·바텀nav 의 6 메뉴
 * 클릭 시 catch-all → 본 not-found 안내 화면. 후속 PR8/PR9 에서 각 화면이 채워지면 자연 무력화.
 *
 * UX:
 *   - "준비 중인 화면입니다" 헤더 + 안내 본문
 *   - CTA 0 (사이드 메뉴로 이동 가능)
 *
 * 디자인 — v8 카드 셸. hex/px 직타 0건.
 */

import {
  NOT_FOUND_TITLE,
  NOT_FOUND_DESCRIPTION,
} from "@/lib/copy/layout/navCopy";

export default function MainNotFound() {
  return (
    <div className="mx-auto w-full max-w-main-max-w flex flex-col items-center justify-center gap-lg py-2xl">
      <div className="card-hero text-center flex flex-col items-center gap-md max-w-[480px]">
        <h1 className="text-h1 text-text-strong">{NOT_FOUND_TITLE}</h1>
        <p className="text-body-md text-text-muted">{NOT_FOUND_DESCRIPTION}</p>
      </div>
    </div>
  );
}
