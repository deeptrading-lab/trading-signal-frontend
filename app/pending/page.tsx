/**
 * `/pending` — 승인 대기 화면(공개 경로, 글로벌 셸 밖).
 *
 * PRD `user-login-auth` §3.5:
 *   - Google 로그인은 됐으나 아직 승인되지 않은(=`pending`) 사용자에게 보이는 정적 안내.
 *   - 라우트 그룹 `(main)` **밖** — `/login` 과 동일한 풀스크린 패턴(글로벌 셸 미상속).
 *   - 게이트 공개 경로(`proxy.ts` PUBLIC_EXACT_PATHS)에 이미 등록 — 미인증(쿠키 없음)에서 도달 가능.
 *   - 세션·앱데이터 노출 0 — 안내 문구 + "다시 로그인"(→ /login) / "로그아웃"(세션 정리) 액션만.
 */

import Link from "next/link";
import { BrandLockup } from "@/components/layout/BrandLockup";
import { PendingLogoutButton } from "@/components/auth/PendingLogoutButton";
import {
  PENDING_DESCRIPTION,
  PENDING_RELOGIN_CTA,
  PENDING_TITLE,
} from "@/lib/copy/auth/pending";

export default function PendingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-xl bg-surface px-lg py-2xl">
      <header className="flex flex-col items-center gap-md text-center">
        <BrandLockup />
        <div className="flex flex-col items-center gap-sm">
          <h1 className="text-display text-text-strong">{PENDING_TITLE}</h1>
          <p className="max-w-[360px] text-body-md text-text-muted">
            {PENDING_DESCRIPTION}
          </p>
        </div>
      </header>

      <div className="flex w-full max-w-[360px] flex-col items-center gap-sm">
        <Link
          href="/login"
          className="button-primary inline-flex w-full items-center justify-center no-underline"
        >
          {PENDING_RELOGIN_CTA}
        </Link>
        <PendingLogoutButton />
      </div>
    </main>
  );
}
