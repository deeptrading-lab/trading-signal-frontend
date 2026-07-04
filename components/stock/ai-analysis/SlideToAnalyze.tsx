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
 * 토큰: hex/px·dark: 직타 0 — 색은 시맨틱 토큰(accent-vivid 진행·임계 / warn·info provider 강조 /
 *   surface-muted·border-line rail·disabled). 라이트/다크는 토큰이 자동 스왑한다.
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

/** provider 별 노브 라벨 색 + 아이콘 — 토큰(claude=warn / codex=info). ProviderChooser 정합. */
const PROVIDER_ACCENT: Record<
  AIAnalysisProvider,
  { text: string; icon: typeof Sparkles }
> = {
  claude: { text: "text-warn", icon: Sparkles },
  codex: { text: "text-info", icon: Zap },
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
          className="mb-2.5 inline-flex gap-1 rounded-pill bg-accent-vivid-soft p-1"
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
                  "inline-flex items-center gap-1 rounded-pill px-3 py-1 text-caption font-bold transition-colors cursor-pointer",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-vivid focus-visible:ring-offset-1 focus-visible:ring-offset-surface",
                  active
                    ? "bg-surface text-accent-vivid shadow-sm"
                    : "text-text-muted hover:text-text-strong",
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
            "group relative flex w-full items-center justify-between gap-2 overflow-hidden rounded-pill p-1 sm:w-auto",
            "h-11",
            "border transition-colors duration-200",
            // 임계 도달 = accent 로 전환("놓으면 시작" 신호). 초록 토큰 부재 → 밝은 파랑 accent 로 상태 변화 표현.
            isThreshold
              ? "border-accent-vivid bg-accent-vivid-soft"
              : "border-border-line bg-surface-muted",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-vivid focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
            "cursor-pointer touch-none",
          )}
        >
          {/* 노브 — 밝은 pill "재분석"(track 보다 밝은 surface). 좌측에서 우측(AI)으로 밀기. */}
          <motion.span
            ref={knobRef}
            aria-hidden
            style={{ x: knobX }}
            className={cn(
              "z-10 inline-flex h-9 shrink-0 items-center gap-1 rounded-pill bg-surface px-2.5",
              "shadow-sm ring-1 ring-border-line group-hover:shadow-md transition-shadow duration-200",
            )}
          >
            {isCommitting && (
              <Loader2 size={13} className="animate-spin text-accent-vivid" />
            )}
            <span className="whitespace-nowrap text-label-sm leading-none text-accent-vivid">
              {COPY.previousDecision.slide.short}
            </span>
            <span
              aria-hidden
              className="text-accent-vivid transition-transform duration-200 group-hover:translate-x-0.5"
            >
              <ArrowRight size={14} />
            </span>
          </motion.span>

          {/* 도착점 — 우측 AI 이름. 노브가 이 자리로 이동해 시작한다. */}
          <span
            aria-hidden
            className={cn(
              "z-0 inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-label-sm pr-2",
              isThreshold ? "text-accent-vivid" : accent.text,
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
