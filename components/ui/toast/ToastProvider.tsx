"use client";

/**
 * ToastProvider — 앱 전역 토스트(임시 알림) 인프라. `app/providers.tsx` 에서 1회 마운트.
 *
 * 액션 피드백(성공/실패)을 화면 상단 인라인 메시지 대신 **하단 중앙 토스트**로 띄운다(놓침 방지).
 * 도메인 코드는 `useToast()`(hooks/utils/useToast) 만 사용 — 본 컨텍스트 직접 접근 금지.
 * 토큰만(hex/px 직타 0)·motion/react enter·exit·자동 소멸 + 수동 닫기·`aria-live`.
 */

import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { setToastListener } from "./toastEmitter";

export type ToastVariant = "error" | "success" | "info";

export interface ToastOptions {
  message: string;
  /** 톤 — error(위험 빨강)/success·info(어두운 중립). 기본 info. */
  variant?: ToastVariant;
  /** 자동 소멸까지 ms. 기본 4000. */
  durationMs?: number;
}

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

export interface ToastContextValue {
  show: (options: ToastOptions) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 4000;
/** 동시 표시 상한 — 초과 시 가장 오래된 것부터 제거(스팸 방지). */
const MAX_TOASTS = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    ({
      message,
      variant = "info",
      durationMs = DEFAULT_DURATION_MS,
    }: ToastOptions) => {
      const id = (idRef.current += 1);
      setToasts((prev) => {
        const next = [...prev, { id, message, variant }];
        return next.length > MAX_TOASTS
          ? next.slice(next.length - MAX_TOASTS)
          : next;
      });
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), durationMs),
      );
    },
    [dismiss],
  );

  // 훅 밖(QueryClient `mutationCache.onError` 등)에서 부른 imperative `toast.*` 를 이 provider 의
  // `show` 로 라우팅 — 동일 UI 로 표시. 언마운트 시 해제(유령 리스너·중복 등록 방지).
  useEffect(() => {
    setToastListener(show);
    return () => setToastListener(null);
  }, [show]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

const VARIANT_CLASS: Record<ToastVariant, string> = {
  // ★ text-surface(테마 반전 토큰) 사용 — text-white(고정 흰색)는 다크에서 배경 토큰(text-strong·
  //   critical)이 밝게 뒤집힐 때 대비가 무너진다. surface 는 배경과 함께 반전돼 항상 읽힌다
  //   (라이트=어두운 배경+흰 글자 / 다크=밝은 배경+어두운 글자).
  error: "bg-critical text-surface",
  success: "bg-text-strong text-surface",
  info: "bg-text-strong text-surface",
};

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      // 모바일(`< md`)은 하단 BottomNav(`fixed bottom-0`, 높이 navbar-h + safe-area) 위로 띄운다
      // — main 콘텐츠와 동일한 하단 여백 계산(navbar-h + safe-area + lg). md+ 는 나비 없어 pb-lg.
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-sm px-lg pt-lg pb-[calc(theme(spacing.navbar-h)+env(safe-area-inset-bottom)+theme(spacing.lg))] md:pb-lg"
      aria-live="assertive"
      aria-atomic="false"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            role={toast.variant === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex w-fit max-w-full items-center gap-sm rounded-md px-md py-sm shadow-overlay",
              VARIANT_CLASS[toast.variant],
            )}
          >
            <span className="text-body-sm">{toast.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="닫기"
              className="shrink-0 rounded-sm p-xs opacity-70 transition-opacity hover:opacity-100"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
