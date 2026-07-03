/**
 * 로그인 폼 — `/login`(앱 비밀번호 게이트)의 인터랙티브 셸.
 *
 * PRD `app-password-gate` §3.4 / AC-16~18:
 *   - 컴포넌트는 도메인 훅 `hooks/auth/useLogin` 만 import(TanStack 훅 직접 import 0).
 *   - 한글 카피는 `lib/copy/auth/login` 참조(평문 산재 0).
 *   - `next` 쿼리는 도메인 훅이 same-origin 검증(open-redirect 차단)한다.
 *
 * polish-login-404 리스킨(프레젠테이션만 — 인증 로직/제출 배선 무변경):
 *   - 카드리스·화이트포워드 중앙 정렬. 셸 밖 화면이라 자체 클린 표면(`bg-surface`, 다크 세이프)을 깐다.
 *   - 브랜드 로크업(`BrandLockup`)이 헤더/사이드바와 동일한 3색 맥박 배지 + 워드마크를 focal 로 노출.
 *   - 제출 버튼은 `components/ui/Button` 원자, 필드 에러는 `input-error`/`input-helper-error` 합성 토큰.
 */

"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useLogin } from "@/hooks/auth/useLogin";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { BrandLockup } from "@/components/layout/BrandLockup";
import {
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
  const isDisabled = isPending || password.length === 0;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-xl bg-surface px-lg py-2xl">
      <header className="flex flex-col items-center gap-md text-center">
        <BrandLockup wordmarkAs="h1" wordmarkId="login-brand" />
        <p id="login-subtitle" className="text-body-sm text-text-muted">
          {LOGIN_SUBTITLE}
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-[360px] flex-col gap-lg"
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
    </main>
  );
}
