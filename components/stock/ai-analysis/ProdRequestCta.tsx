"use client";

/**
 * prod 분석 요청 CTA 버튼(DESIGN.md `request-cta`).
 *
 * prod 는 가용 CLI 0 전제라 슬라이드 스위치(SlideToAnalyze) 대신 버튼 1개로 단순화한다(R1).
 * 누르면 enqueue → 상태 배너로 전이. 응답 대기 중(isPending)에는 disabled + 스피너 + "요청 보내는 중…".
 *
 * 토큰: bg-accent-vivid text-surface(앱 공통 primary 파랑) + rounded-lg + h-button-primary-h(40px,
 * hit-area-min 정합 — WCAG 2.5.5). shadow-accent-vivid/20 로 "누를 수 있는 물체" 어포던스.
 * reduced-motion: 스피너 회전을 motion-reduce 로 정지(아이콘 + 텍스트로 의미 유지).
 * 접근성: native <button> + 명시 라벨, disabled 시 aria-disabled + aria-busy.
 */

import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { COPY } from "@/lib/copy/stock/aiAnalysis";

interface ProdRequestCtaProps {
  label: string;
  isPending: boolean;
  onClick: () => void;
}

export function ProdRequestCta({
  label,
  isPending,
  onClick,
}: ProdRequestCtaProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      aria-disabled={isPending || undefined}
      aria-busy={isPending || undefined}
      className={cn(
        // 모바일 풀폭(터치 타깃, DESIGN.md 모바일) · sm+ 자동폭(우측/중앙 정렬).
        "inline-flex h-button-primary-h w-full items-center justify-center gap-sm rounded-lg sm:w-auto",
        "bg-accent-vivid text-surface text-button",
        "shadow-md shadow-accent-vivid/20 transition-all active:scale-95 cursor-pointer",
        "hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-80 disabled:active:scale-100",
        "px-card-px-mobile",
      )}
    >
      {isPending ? (
        <Loader2 size={15} className="animate-spin motion-reduce:animate-none" />
      ) : (
        <Sparkles size={15} />
      )}
      <span>{isPending ? COPY.prodQueue.requesting : label}</span>
    </button>
  );
}
