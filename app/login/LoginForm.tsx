/**
 * 로그인 폼 — `/login`(Google 로그인 전용)의 인터랙티브 셸.
 *
 * PRD `user-login-auth` §3.4 (비밀번호 로그인 폐지):
 *   - **Google 로그인** = `<a href="/api/auth/google/start?next=…">`(리다이렉트 플로우 — 클라이언트 `fetch` 0).
 *     서버가 code 를 교환한다(BFF).
 *   - 콜백/시작 라우트의 `?error=<code>` 는 코드별 친화 한글 안내로 상단 알림(`loginOAuthErrorMessage`).
 *   - `googleEnabled=false`(OAuth 미구성 = 게이트 비활성) → "로그인 불필요" 안내 + 홈 링크(방어적 안내).
 *   - 한글 카피는 `lib/copy/auth/login` 참조. `useSearchParams` 는 상위 page 의 Suspense 경계 안에서 호출.
 */

"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrandLockup } from "@/components/layout/BrandLockup";
import {
  LOGIN_GATE_DISABLED_NOTICE,
  LOGIN_GO_HOME,
  LOGIN_GOOGLE_CTA,
  LOGIN_SUBTITLE_GOOGLE,
  loginOAuthErrorMessage,
} from "@/lib/copy/auth/login";

/** open-redirect 방지 — same-origin 절대경로(`/` 시작, `//` 불허)만 허용. 그 외 null(next 미첨부). */
function safeNext(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const searchParams = useSearchParams();
  const oauthError = loginOAuthErrorMessage(searchParams.get("error"));

  const next = safeNext(searchParams.get("next"));
  const googleHref = `/api/auth/google/start${
    next ? `?next=${encodeURIComponent(next)}` : ""
  }`;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-xl bg-surface px-lg py-2xl">
      <header className="flex flex-col items-center gap-md text-center">
        <BrandLockup wordmarkAs="h1" wordmarkId="login-brand" />
        {googleEnabled ? (
          <p id="login-subtitle" className="text-body-sm text-text-muted">
            {LOGIN_SUBTITLE_GOOGLE}
          </p>
        ) : null}
      </header>

      {oauthError ? (
        <p
          role="alert"
          className="w-full max-w-[360px] rounded-sm bg-critical-soft px-md py-sm text-center text-body-sm text-critical"
        >
          {oauthError}
        </p>
      ) : null}

      {googleEnabled ? (
        <div className="flex w-full max-w-[360px] flex-col gap-lg">
          <a
            href={googleHref}
            className="button-primary inline-flex w-full items-center justify-center gap-sm no-underline"
          >
            {LOGIN_GOOGLE_CTA}
          </a>
        </div>
      ) : (
        // OAuth 미구성 = 게이트 비활성(앱 공개) — 정상 흐름 아님, 방어적 안내.
        <div className="flex w-full max-w-[360px] flex-col items-center gap-md text-center">
          <p className="text-body-sm text-text-muted">{LOGIN_GATE_DISABLED_NOTICE}</p>
          <Link
            href="/"
            className="button-primary inline-flex w-full items-center justify-center no-underline"
          >
            {LOGIN_GO_HOME}
          </Link>
        </div>
      )}
    </main>
  );
}
