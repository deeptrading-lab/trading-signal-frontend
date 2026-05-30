/**
 * 로그인 도메인 훅 — 폼 제출/에러/pending 을 화면에 추상화.
 *
 * PRD `app-password-gate` §3.4 / AC-16 / AC-17:
 *   - 화면 컴포넌트는 본 훅만 import(`useMutation` 등 TanStack 인터페이스 누출 금지).
 *   - `submit(password)` → 성공 시 `next`(open-redirect 차단된 same-origin 절대경로) 또는 `/` 로 이동.
 *   - 실패 시 한글 에러 메시지(`lib/copy/auth/login`)만 노출 — 비밀번호 값/힌트 노출 0.
 *   - 성공 이동은 `window.location.assign`(full navigation) — 새 세션 쿠키를 서버가 즉시 보도록.
 */

"use client";

import { useCallback, useState } from "react";
import { useMutationLogin } from "@/hooks/query/useMutationLogin";
import { isApiError } from "@/lib/api/errors";
import {
  LOGIN_ERROR_GATE_DISABLED,
  LOGIN_ERROR_GENERIC,
  LOGIN_ERROR_INVALID,
} from "@/lib/copy/auth/login";

export type UseLoginResult = {
  submit: (password: string) => void;
  isPending: boolean;
  /** 사용자 노출 한글 에러(없으면 null). 비밀번호 값/힌트 미포함. */
  error: string | null;
  clearError: () => void;
};

/**
 * open-redirect 방지 — `next` 는 same-origin 절대경로(`/` 시작, `//` 불허)만 허용.
 * 그 외엔 `/` 로 폴백(외부 도메인 유출 차단).
 */
function safeNext(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  return raw;
}

/** ApiError 의 status 를 한글 에러 카피로 매핑(값/힌트 노출 0). */
function toErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 401) return LOGIN_ERROR_INVALID;
    if (error.status === 409) return LOGIN_ERROR_GATE_DISABLED;
  }
  return LOGIN_ERROR_GENERIC;
}

export function useLogin(nextParam: string | null): UseLoginResult {
  const mutation = useMutationLogin();
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    (password: string) => {
      setError(null);
      mutation.mutate(password, {
        onSuccess: () => {
          // full navigation — 새 세션 쿠키를 서버(middleware)가 즉시 보게 한다.
          window.location.assign(safeNext(nextParam));
        },
        onError: (err) => {
          setError(toErrorMessage(err));
        },
      });
    },
    [mutation, nextParam],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    submit,
    isPending: mutation.isPending,
    error,
    clearError,
  };
}
