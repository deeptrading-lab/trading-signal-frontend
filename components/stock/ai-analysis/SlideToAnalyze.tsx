"use client";

/**
 * SlideToAnalyze — "밀어서 분석 시작" 슬라이드 스위치 (slide-to-analyze 디자인 §시안 A).
 *
 * PreviousDecisionIntro 의 기본 CTA(파란 버튼)를 대체한다. 세 입력 경로(드래그·클릭·키보드)가
 * 모두 동일하게 onStart(provider) 를 호출한다. 제스처·상태 로직은 useSlideToAnalyze 훅에 있다.
 *
 * 접근성(스펙 §접근성):
 *   - 컨트롤 본체 = native <button> (slider 아님). aria-label "○○로 분석 시작".
 *   - committing 동안 aria-busy + 별도 aria-live="polite" 진행 안내.
 *   - 다중 AI 선택은 별도 role="radiogroup" 행으로 분리(button 과 역할 중첩 회피).
 *   - focus-visible 포커스 링(마우스 클릭 시 억제), 노브 터치타깃 ≥44px(h-11).
 *
 * 시안 A 다중 AI: available.length >= 2 면 provider 토글(radiogroup)을 트랙 위 행에 둔다.
 *   length === 1 이면 그 AI 로 바로 슬라이드(토글 없음). length === 0 / 로딩 = 호출부에서 비표시.
 *
 * 토큰: hex/px 직타 금지. 기존 AI 패널 Tailwind 패턴 재사용(blue-600 진행 / green threshold /
 *   amber·emerald provider 강조 / slate disabled). 다크모드 dark: variant 동시 적용.
 */

import { useState } from "react";
import { motion } from "motion/react";
import { Sparkles, Zap, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import { useSlideToAnalyze } from "@/hooks/stock/useSlideToAnalyze";
import type { AIAnalysisProvider } from "@/lib/types/stock/aiAnalysis";

interface SlideToAnalyzeProps {
  /** 가용 provider 목록(>=1 보장 — 0개·로딩은 호출부 폴백). */
  available: AIAnalysisProvider[];
  /** 기본 선택 provider(직전 분석 provider). */
  defaultProvider: AIAnalysisProvider;
  /** 세 입력 경로 공통 실행 콜백. */
  onStart: (provider: AIAnalysisProvider) => void;
}

/** provider 별 노브 라벨 색 + 아이콘(ProviderChooser/codex 토큰 정합). */
const PROVIDER_ACCENT: Record<
  AIAnalysisProvider,
  { text: string; icon: typeof Sparkles }
> = {
  claude: { text: "text-amber-700 dark:text-amber-500", icon: Sparkles },
  codex: { text: "text-emerald-700 dark:text-emerald-500", icon: Zap },
};

export function SlideToAnalyze({
  available,
  defaultProvider,
  onStart,
}: SlideToAnalyzeProps) {
  // 기본 선택 = defaultProvider 가 가용하면 그대로, 아니면 첫 가용 provider.
  const initialProvider = available.includes(defaultProvider)
    ? defaultProvider
    : available[0];
  const multi = available.length >= 2;

  // 선택 provider 로컬 상태 — 초기값 = 직전 분석 provider. 패널 열림마다 새로 마운트되므로
  // 마운트 후 available 이 도중에 바뀌는 케이스는 없다(호출부가 안정된 snapshot 으로 렌더).
  const [selected, setSelected] = useState<AIAnalysisProvider>(initialProvider);

  const { phase, knobX, isBusy, trackRef, knobRef, handlers } =
    useSlideToAnalyze({ provider: selected, onStart });

  const accent = PROVIDER_ACCENT[selected];
  const KnobIcon = accent.icon;

  const isThreshold = phase === "threshold-reached";
  const isCommitting = phase === "committing";

  return (
    <div className="w-full">
      {/* 다중 AI — provider 토글(radiogroup). button 컨트롤과 역할 분리. */}
      {multi && (
        <div
          role="radiogroup"
          aria-label={COPY.previousDecision.slide.pickProvider}
          className="mb-2.5 inline-flex gap-1 rounded-full bg-blue-50 p-1 dark:bg-blue-950/40"
        >
          {available.map((p) => {
            const pAccent = PROVIDER_ACCENT[p];
            const PIcon = pAccent.icon;
            const active = p === selected;
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={isBusy}
                onClick={() => setSelected(p)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-colors cursor-pointer",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-950",
                  active
                    ? "bg-white text-blue-800 shadow-sm dark:bg-slate-100 dark:text-blue-900"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                  isBusy && "cursor-not-allowed opacity-60",
                )}
              >
                <PIcon size={12} className={active ? pAccent.text : undefined} />
                {COPY.provider[p]}
              </button>
            );
          })}
        </div>
      )}

      {/* 슬라이드 트랙 — 콘텐츠 폭(노브 + AI 텍스트)만큼만. 노브 좌측 → 우측(AI)으로 밀기. */}
      <div className="w-full sm:w-auto">
        <button
          type="button"
          ref={trackRef}
          aria-label={COPY.previousDecision.slide.ariaStart(COPY.provider[selected])}
          aria-busy={isCommitting}
          {...handlers}
          className={cn(
            "group relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-full p-1 sm:w-auto",
            "h-11",
            "border transition-colors duration-200",
            isThreshold
              ? "border-green-300 bg-green-100 dark:border-green-900 dark:bg-green-950/40"
              : "border-blue-200 bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950",
            "cursor-pointer touch-none",
          )}
        >
          {/* 노브 — 흰 pill "재분석". 좌측에서 우측(AI)으로 밀기. */}
          <motion.span
            ref={knobRef}
            aria-hidden
            style={{ x: knobX }}
            className={cn(
              "z-10 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-slate-50 px-3 dark:bg-slate-200",
              "shadow-sm ring-1 ring-black/5 group-hover:shadow-md transition-shadow duration-200",
            )}
          >
            {isCommitting && (
              <Loader2 size={13} className="animate-spin text-blue-600" />
            )}
            <span className="whitespace-nowrap text-[12px] font-bold leading-none text-blue-700 dark:text-blue-800">
              {COPY.previousDecision.slide.short}
            </span>
            <span
              aria-hidden
              className="text-blue-400 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-blue-500"
            >
              <ArrowRight size={14} />
            </span>
          </motion.span>

          {/* 도착점 — 우측 AI 이름. 노브가 이 자리로 이동해 시작한다. */}
          <span
            aria-hidden
            className={cn(
              "z-0 inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[13px] font-bold",
              isThreshold ? "text-green-700 dark:text-green-400" : accent.text,
            )}
          >
            <KnobIcon size={14} />
            {COPY.provider[selected]}
          </span>
        </button>
      </div>

      {/* 스크린리더 진행 안내 — committing 동안만. */}
      <span className="sr-only" role="status" aria-live="polite">
        {isCommitting ? COPY.previousDecision.slide.starting : ""}
      </span>
    </div>
  );
}
