/**
 * toastEmitter — 훅을 쓸 수 없는 위치에서도 부를 수 있는 imperative 토스트 emitter.
 *
 * `QueryClient` 설정(`mutationCache.onError`)처럼 컴포넌트/훅 밖에서 토스트를 띄우기 위한
 * 모듈 싱글톤. `ToastProvider` 가 마운트 시 `setToastListener(show)` 로 자신의 `show` 를 등록하고
 * 언마운트 시 해제한다. 리스너 미등록(SSR·프로바이더 밖)에서는 조용히 no-op.
 *
 * 주의: 이 파일은 순수 모듈 — React 훅 import 금지(서버/클라 어디서든 import 가능해야 함).
 * 컴포넌트/도메인 코드는 여전히 `useToast()` 를 쓴다. 본 emitter 는 훅 밖 전용.
 */

import type { ToastOptions, ToastVariant } from "./ToastProvider";

let listener: ((options: ToastOptions) => void) | null = null;

/** ToastProvider 가 자신의 `show` 를 등록/해제(언마운트 시 null). */
export function setToastListener(
  fn: ((options: ToastOptions) => void) | null,
): void {
  listener = fn;
}

function emit(message: string, variant: ToastVariant): void {
  listener?.({ message, variant });
}

/** 훅 밖에서 쓰는 imperative 토스트 API. 리스너 미등록이면 no-op. */
export const toast = {
  show: (options: ToastOptions) => listener?.(options),
  error: (message: string) => emit(message, "error"),
  success: (message: string) => emit(message, "success"),
  info: (message: string) => emit(message, "info"),
};
