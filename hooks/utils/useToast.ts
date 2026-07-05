"use client";

/**
 * useToast — 전역 토스트 트리거 훅. `app/providers.tsx` 의 ToastProvider 하위에서만 사용.
 *
 * 도메인 코드는 `toast.error/success/info(메시지)` 또는 `toast.show({...})` 로 알림을 띄운다.
 * ToastProvider 밖에서 호출하면 throw(마운트 보장 — 조용한 무동작 방지).
 */

import { useContext, useMemo } from "react";
import {
  ToastContext,
  type ToastContextValue,
  type ToastOptions,
} from "@/components/ui/toast/ToastProvider";

export interface ToastApi {
  show: (options: ToastOptions) => void;
  error: (message: string) => void;
  success: (message: string) => void;
  info: (message: string) => void;
}

export function useToast(): ToastApi {
  const ctx = useContext<ToastContextValue | null>(ToastContext);
  if (!ctx) {
    throw new Error("useToast 는 ToastProvider 하위에서만 사용할 수 있어요.");
  }
  const { show } = ctx;
  return useMemo(
    () => ({
      show,
      error: (message: string) => show({ message, variant: "error" }),
      success: (message: string) => show({ message, variant: "success" }),
      info: (message: string) => show({ message, variant: "info" }),
    }),
    [show],
  );
}
