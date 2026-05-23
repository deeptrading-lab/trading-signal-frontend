/**
 * (main)/not-found.tsx — 미존재 라우트 안내 화면.
 *
 * PR3 (finsight-redesign) 신규.
 *
 * 본 PR3 시점에 `/dashboard`, `/analyze`, `/market`, `/watchlist`, `/profile` 5 라우트는
 * 미존재. 사이드바·바텀nav 의 6 메뉴가 클릭 가능하지만 라우팅 시 자연 404 → 본 not-found
 * 가 안내 화면을 노출. 후속 PR (PR5~PR9) 에서 각 화면이 채워지면 본 not-found 자연 무력화.
 *
 * UX:
 *   - "준비 중인 화면입니다" 헤더 + 안내 본문
 *   - 홈(`/`)으로 돌아가기 CTA
 *
 * 디자인 — v8 카드 셸 + button-primary 합성 토큰 흡수. hex/px 직타 0건.
 */

import Link from "next/link";
import {
  NOT_FOUND_TITLE,
  NOT_FOUND_DESCRIPTION,
  NOT_FOUND_HOME_CTA,
} from "@/lib/copy/layout/navCopy";

export default function MainNotFound() {
  return (
    <div className="mx-auto w-full max-w-main-max-w flex flex-col items-center justify-center gap-lg py-2xl">
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
