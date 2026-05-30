/**
 * 로그인 폼 — `/login` 의 인터랙티브 셸.
 *
 * PRD `app-password-gate` §3.4 / AC-16~18:
 *   - 컴포넌트는 도메인 훅 `hooks/auth/useLogin` 만 import(TanStack 훅 직접 import 0).
 *   - 한글 카피는 `lib/copy/auth/login` 참조(평문 산재 0).
 *   - 기존 v8 합성 클래스(`card`/`input`/`input-error`/`input-label`/`button-primary`/
 *     `input-helper-error`)만 사용 — 신규 디자인 토큰 0.
 *   - `next` 쿼리는 도메인 훅이 same-origin 검증(open-redirect 차단)한다.
 */

"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useLogin } from "@/hooks/auth/useLogin";
import { cn } from "@/lib/utils/cn";
import {
  LOGIN_BRAND,
  LOGIN_PASSWORD_LABEL,
  LOGIN_PASSWORD_PLACEHOLDER,
  LOGIN_SUBMIT,
  LOGIN_SUBMIT_PENDING,
  LOGIN_SUBTITLE,
} from "@/lib/copy/auth/login";

export function LoginForm() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const { submit, isPending, error, clearError } = useLogin(nextParam);
  const [password, setPassword] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending || password.length === 0) return;
    submit(password);
  };

  const hasError = error !== null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-muted p-lg">
      <form
        onSubmit={handleSubmit}
        className="card flex w-full max-w-[360px] flex-col gap-lg"
        aria-labelledby="login-brand"
      >
        <div className="flex flex-col gap-xs text-center">
          <h1 id="login-brand" className="text-h1 text-text-strong">
            {LOGIN_BRAND}
          </h1>
          <p className="text-body-sm text-text-muted">{LOGIN_SUBTITLE}</p>
        </div>

        <div className="flex flex-col gap-xs">
          <label htmlFor="login-password" className="input-label">
            {LOGIN_PASSWORD_LABEL}
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
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

        <button
          type="submit"
          className="button-primary w-full"
          disabled={isPending || password.length === 0}
          aria-disabled={isPending || password.length === 0}
        >
          {isPending ? LOGIN_SUBMIT_PENDING : LOGIN_SUBMIT}
        </button>
      </form>
    </main>
  );
}
