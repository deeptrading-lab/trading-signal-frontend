/**
 * 로그인 폼 — `/login`(Google 로그인 + 전환기 비밀번호 폴백)의 인터랙티브 셸.
 *
 * PRD `app-password-gate` §3.4 / `user-login-auth` §3.4 / AC-21·22:
 *   - **Google 로그인** = `<a href="/api/auth/google/start?next=…">`(리다이렉트 플로우 — 클라이언트 `fetch` 0).
 *     `googleEnabled` 일 때만 노출. 서버가 code 를 교환한다(BFF).
 *   - **비밀번호 폼** = `passwordEnabled` 일 때만 보조/폴백으로 렌더(전환기 공존). 도메인 훅 `useLogin` 만 import
 *     (TanStack 인터페이스 누출 0). 실패 메시지에 비밀번호 값/힌트 노출 0(보안).
 *   - 콜백/시작 라우트가 실은 `?error=<code>` 는 코드별 친화 한글 안내로 상단 알림(`loginOAuthErrorMessage`).
 *   - 한글 카피는 `lib/copy/auth/login` 참조(평문 산재 0). 신규 hex/px 0, 기존 토큰·`BrandLockup`·`Button` 재사용.
 *
 * 방식 조합:
 *   - google + password → Google 버튼(primary) · 구분선 · 비밀번호 폼.
 *   - google only       → Google 버튼만.
 *   - password only     → 비밀번호 폼만(app-password-gate 기존 동작 보존).
 *   - 둘 다 off          → "로그인 불필요" 안내 + 홈 링크(게이트 비활성 — 정상 흐름 아님, 방어적 안내).
 */

"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLogin } from "@/hooks/auth/useLogin";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { BrandLockup } from "@/components/layout/BrandLockup";
import {
  LOGIN_DIVIDER,
  LOGIN_GATE_DISABLED_NOTICE,
  LOGIN_GO_HOME,
  LOGIN_GOOGLE_CTA,
  LOGIN_PASSWORD_LABEL,
  LOGIN_PASSWORD_PLACEHOLDER,
  LOGIN_SUBMIT,
  LOGIN_SUBMIT_PENDING,
  LOGIN_SUBTITLE,
  LOGIN_SUBTITLE_GOOGLE,
  loginOAuthErrorMessage,
} from "@/lib/copy/auth/login";

/** open-redirect 방지 — same-origin 절대경로(`/` 시작, `//` 불허)만 허용. 그 외 null(next 미첨부). */
function safeNext(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export function LoginForm({
  googleEnabled,
  passwordEnabled,
}: {
  googleEnabled: boolean;
  passwordEnabled: boolean;
}) {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const oauthError = loginOAuthErrorMessage(searchParams.get("error"));
  // useLogin 은 비밀번호 폼 렌더 여부와 무관하게 항상 호출(조건부 훅 금지). 폼 미렌더 시 무해.
  const { submit, isPending, error, clearError } = useLogin(nextParam);
  const [password, setPassword] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending || password.length === 0) return;
    submit(password);
  };

  const hasError = error !== null;
  const isDisabled = isPending || password.length === 0;

  const next = safeNext(nextParam);
  const googleHref = `/api/auth/google/start${
    next ? `?next=${encodeURIComponent(next)}` : ""
  }`;

  const gateDisabled = !googleEnabled && !passwordEnabled;
  const subtitle = googleEnabled ? LOGIN_SUBTITLE_GOOGLE : LOGIN_SUBTITLE;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-xl bg-surface px-lg py-2xl">
      <header className="flex flex-col items-center gap-md text-center">
        <BrandLockup wordmarkAs="h1" wordmarkId="login-brand" />
        {!gateDisabled ? (
          <p id="login-subtitle" className="text-body-sm text-text-muted">
            {subtitle}
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

      {gateDisabled ? (
        <div className="flex w-full max-w-[360px] flex-col items-center gap-md text-center">
          <p className="text-body-sm text-text-muted">
            {LOGIN_GATE_DISABLED_NOTICE}
          </p>
          <Link
            href="/"
            className="button-primary inline-flex w-full items-center justify-center no-underline"
          >
            {LOGIN_GO_HOME}
          </Link>
        </div>
      ) : (
        <div className="flex w-full max-w-[360px] flex-col gap-lg">
          {googleEnabled ? (
            <a
              href={googleHref}
              className="button-primary inline-flex w-full items-center justify-center gap-sm no-underline"
            >
              {LOGIN_GOOGLE_CTA}
            </a>
          ) : null}

          {googleEnabled && passwordEnabled ? (
            <div className="flex items-center gap-md" aria-hidden="true">
              <span className="flex-1 border-t border-border-line" />
              <span className="text-caption text-text-muted">{LOGIN_DIVIDER}</span>
              <span className="flex-1 border-t border-border-line" />
            </div>
          ) : null}

          {passwordEnabled ? (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-lg"
              aria-labelledby="login-brand login-subtitle"
            >
              <div className="flex flex-col gap-xs">
                <label htmlFor="login-password" className="input-label">
                  {LOGIN_PASSWORD_LABEL}
                </label>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  autoFocus={!googleEnabled}
                  className={cn(hasError ? "input-error" : "input")}
                  placeholder={LOGIN_PASSWORD_PLACEHOLDER}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (hasError) clearError();
                  }}
                  aria-invalid={hasError}
                  aria-describedby={hasError ? "login-error" : undefined}
                />
                {hasError ? (
                  <p id="login-error" role="alert" className="input-helper-error">
                    {error}
                  </p>
                ) : null}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isDisabled}
                aria-disabled={isDisabled}
                aria-busy={isPending}
              >
                {isPending ? LOGIN_SUBMIT_PENDING : LOGIN_SUBMIT}
              </Button>
            </form>
          ) : null}
        </div>
      )}
    </main>
  );
}
