/**
 * 로그인 mutation 훅 — TanStack Query useMutation.
 *
 * PRD `app-password-gate` §3.4 / AC-16:
 *   - 화면 컴포넌트는 본 훅을 직접 import 하지 않는다(`useMutation` 누출 금지).
 *     도메인 훅 `hooks/auth/useLogin` 가 본 훅을 호출하고 `submit`/`isPending`/`error` 만 노출.
 *   - 에러는 `lib/api/client` 인터셉터가 `ApiError` 로 매핑한 뒤 throw 한다.
 */

"use client";

import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { login, type LoginResponse } from "@/lib/api/auth/login";
import type { ApiError } from "@/lib/api/errors";

export function useMutationLogin(): UseMutationResult<
  LoginResponse,
  ApiError,
  string
> {
  return useMutation<LoginResponse, ApiError, string>({
    mutationFn: (password) => login(password),
  });
}
