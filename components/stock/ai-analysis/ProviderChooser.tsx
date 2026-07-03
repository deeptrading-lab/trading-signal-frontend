"use client";

/**
 * AI 분석 진입 화면 — 로컬에 설치된 CLI(claude·codex)를 감지해 공급자 선택지를 보여준다.
 *
 * AIAnalysisPanel 의 "시작 전 빈 상태"에 렌더된다(패널이 열렸을 때만 마운트 → 가용성 조회도 그때만).
 * 공급자 선택은 이 화면으로 일원화한다(헤더 토글 없음).
 *
 * 분기:
 *   - 로딩          → 스피너.
 *   - 조회 실패     → 오류 안내 + 다시 시도(refetch).
 *   - Vercel        → 로컬 전용 안내.
 *   - 0개(미설치)   → 설치 안내.
 *   - 1개           → "{공급자}로 분석할 수 있어요. 시작할까요?" + [분석 시작] (해당 공급자 색·아이콘).
 *   - 2개           → Claude·Codex 카드 2개 → 클릭 시 해당 공급자로 실행.
 *
 * 레이아웃 주의: 바깥 컨테이너(ChooserShell)는 flex 가 아니라 **block + mx-auto + text-center** 다.
 * flex `items-center` 안에 한글 문단을 넣으면 flex 아이템이 shrink-to-fit(min-content) 으로 줄어
 * 한 글자씩 세로로 깨진다. block 은 부모(패널 풀폭)에서 폭을 받으므로 그 문제가 없다.
 */

import { Loader2, Sparkles, Zap, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import { useQueryAIProviders } from "@/hooks/stock/useQueryAIProviders";
import type { AIAnalysisProvider } from "@/lib/types/stock/aiAnalysis";

interface ProviderChooserProps {
  /** 공급자 확정 시 호출 — 해당 공급자로 처음부터 분석 시작(훅의 start). */
  onSelect: (provider: AIAnalysisProvider) => void;
}

// 공급자 색 — 토큰(다크 자동): claude=warn(웜/신중) / codex=info(쿨/신속). hex·dark: 직타 0.
const PROVIDER_STYLE: Record<
  AIAnalysisProvider,
  { icon: typeof Sparkles; accent: string; soft: string; ring: string }
> = {
  claude: {
    icon: Sparkles,
    accent: "text-warn",
    soft: "bg-warn-soft",
    ring: "border-border-line hover:border-warn hover:bg-warn-soft",
  },
  codex: {
    icon: Zap,
    accent: "text-info",
    soft: "bg-info-soft",
    ring: "border-border-line hover:border-info hover:bg-info-soft",
  },
};

/** 분기 공통 셸 — block(폭 collapse 방지) + 중앙 정렬. */
function ChooserShell({
  children,
  live,
}: {
  children: React.ReactNode;
  live?: boolean;
}) {
  return (
    <div
      className="mx-auto w-full max-w-[22rem] md:max-w-[44rem] px-6 py-16 text-center"
      role={live ? "status" : undefined}
      aria-live={live ? "polite" : undefined}
    >
      {children}
    </div>
  );
}

/** 회색 원형 + 아이콘 (안내/오류 상태 공용). */
function InfoIcon() {
  return (
    <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-surface-muted flex items-center justify-center">
      <AlertCircle className="text-text-muted w-7 h-7" />
    </div>
  );
}

function ProviderCard({
  provider,
  onSelect,
}: {
  provider: AIAnalysisProvider;
  onSelect: (provider: AIAnalysisProvider) => void;
}) {
  const style = PROVIDER_STYLE[provider];
  const Icon = style.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(provider)}
      className={cn(
        "flex flex-col items-center text-center gap-2 rounded-md border bg-surface px-md py-lg transition-colors cursor-pointer active:scale-95",
        // PC: 아이콘 왼쪽 + 텍스트 오른쪽 가로 카드(설명 한 줄).
        "md:flex-row md:items-center md:text-left md:gap-4 md:px-6",
        style.ring,
      )}
    >
      <Icon className={cn("w-7 h-7 shrink-0", style.accent)} />
      <span className="flex flex-col gap-0.5 min-w-0">
        <span className="text-body-sm-strong text-text-strong">
          {COPY.provider[provider]}
        </span>
        <span className="text-caption text-text-muted leading-snug break-keep md:whitespace-nowrap">
          {COPY.chooser.desc[provider]}
        </span>
      </span>
    </button>
  );
}

export function ProviderChooser({ onSelect }: ProviderChooserProps) {
  const { data, isLoading, isError, refetch, isFetching } = useQueryAIProviders();

  if (isLoading) {
    return (
      <ChooserShell live>
        <Loader2 className="mx-auto mb-3 w-7 h-7 animate-spin text-text-muted" />
        <p className="text-body-sm text-text-muted break-keep">{COPY.chooser.loading}</p>
      </ChooserShell>
    );
  }

  if (isError || !data) {
    return (
      <ChooserShell live>
        <InfoIcon />
        <p className="text-body-sm text-text-muted leading-relaxed break-keep">
          {COPY.chooser.error}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="mx-auto mt-4 inline-flex items-center gap-1.5 px-md py-2 bg-surface-muted hover:bg-border-line text-text-strong rounded-sm text-body-sm font-bold transition-colors cursor-pointer disabled:opacity-60"
        >
          <RefreshCw size={14} className={cn(isFetching && "animate-spin")} />
          {COPY.chooser.retry}
        </button>
      </ChooserShell>
    );
  }

  if (data.vercel) {
    return (
      <ChooserShell live>
        <InfoIcon />
        <p className="text-body-sm text-text-muted leading-relaxed break-keep">
          {COPY.chooser.vercel}
        </p>
      </ChooserShell>
    );
  }

  const { available } = data;

  if (available.length === 0) {
    return (
      <ChooserShell live>
        <InfoIcon />
        <p className="text-body-sm text-text-muted leading-relaxed break-keep">
          {COPY.chooser.noneLocal}
        </p>
      </ChooserShell>
    );
  }

  if (available.length === 1) {
    const only = available[0];
    const style = PROVIDER_STYLE[only];
    const Icon = style.icon;
    return (
      <ChooserShell>
        <div className={cn("mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center", style.soft)}>
          <Icon className={cn("w-7 h-7", style.accent)} />
        </div>
        <p className="text-body-sm text-text-muted leading-relaxed break-keep">
          <span className={cn("font-bold", style.accent)}>{COPY.provider[only]}</span>
          {COPY.chooser.singleSuffix}
        </p>
        <button
          type="button"
          onClick={() => onSelect(only)}
          className="mx-auto mt-5 block px-6 py-2.5 bg-accent-vivid hover:brightness-110 text-surface rounded-sm text-button shadow-md shadow-accent-vivid/20 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
        >
          {COPY.chooser.start}
        </button>
      </ChooserShell>
    );
  }

  return (
    <ChooserShell>
      <h3 className="mb-4 text-body-sm-strong text-text-strong break-keep">
        {COPY.chooser.title}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {available.map((provider) => (
          <ProviderCard key={provider} provider={provider} onSelect={onSelect} />
        ))}
      </div>
    </ChooserShell>
  );
}
