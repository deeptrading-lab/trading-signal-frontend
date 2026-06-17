/**
 * AIDecisionDetailSheet — 결과 카드 클릭 시 뜨는 결론 상세 모달.
 *
 * 저장된 결론 전체가 목록 응답에 포함돼 있어 추가 페치 없이 즉시 렌더한다.
 * 본문은 기존 FinalVerdictCard(라이브 패널과 동일 렌더)를 그대로 재사용하고,
 * 헤더에 종목명·ticker·분석 엔진·시각·토큰 요약, 그 아래 감성 배지를 얹는다.
 */

"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime } from "@/lib/utils/formatRelativeTime";
import { fmtCost, fmtTokens } from "./format";
import { FinalVerdictCard } from "@/components/stock/ai-analysis/FinalVerdictCard";
import { SentimentBadge } from "@/components/stock/ai-analysis/SentimentBadge";
import { ReanalyzeButton } from "./ReanalyzeButton";
import { PROVIDER_TAB_CLAUDE, PROVIDER_TAB_CODEX } from "@/lib/copy/analyze/labels";
import {
  CARD_COST_LABEL,
  CARD_TOKENS_LABEL,
  CARD_TOKENS_NONE,
  DETAIL_CLOSE,
  DETAIL_PROVIDER_PREFIX,
  MEASURE_BADGE_UNMEASURED,
} from "@/lib/copy/analyze/labels";
import type { AIDecisionListItem } from "@/lib/types/stock/aiAnalysisDecisions";

function tokenSummary(item: AIDecisionListItem): string {
  const { tokens } = item;
  if (!tokens) return CARD_TOKENS_NONE;
  if (!tokens.measured) return MEASURE_BADGE_UNMEASURED;
  const total = (tokens.totalInputTokens ?? 0) + (tokens.totalOutputTokens ?? 0);
  const cost =
    tokens.totalCostUsd !== null ? ` · ${CARD_COST_LABEL} ${fmtCost(tokens.totalCostUsd)}` : "";
  return `${CARD_TOKENS_LABEL} ${fmtTokens(total)}${cost}`;
}

interface AIDecisionDetailSheetProps {
  item: AIDecisionListItem;
  /** 컨테이너가 해석한 종목명(없으면 ticker). */
  name: string;
  onClose: () => void;
}

export function AIDecisionDetailSheet({ item, name, onClose }: AIDecisionDetailSheetProps) {
  const providerLabel = item.provider === "claude" ? PROVIDER_TAB_CLAUDE : PROVIDER_TAB_CODEX;

  // Escape 로 닫기 + 배경 스크롤 잠금.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex sm:items-center sm:justify-center sm:p-lg"
      role="dialog"
      aria-modal="true"
      aria-label={`${name} AI 분석 결론`}
    >
      {/* backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* panel — 모바일 풀스크린 / sm+ 중앙 와이드 모달 */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative flex flex-col bg-surface shadow-lg overflow-hidden",
          "w-full h-full",
          "sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-[56rem] lg:max-w-[64rem] sm:rounded-2xl",
        )}
      >
        {/* 헤더 — 고정, 본문만 스크롤. 감성 배지를 메타 줄 우측에 pin 해 스크롤 중에도 보이게. */}
        <div className="flex-none flex flex-col gap-xs px-lg py-md border-b border-border-line">
          <div className="flex items-center justify-between gap-md">
            <div className="min-w-0 flex-1 text-display font-bold text-text-strong truncate tracking-tight leading-tight">
              {name}
            </div>
            <div className="flex flex-shrink-0 items-center gap-xs">
              <ReanalyzeButton item={item} name={name} onTriggered={onClose} />
              <button
                type="button"
                aria-label={DETAIL_CLOSE}
                onClick={onClose}
                className={cn(
                  "inline-flex items-center justify-center w-9 h-9 rounded-full",
                  "text-text-muted hover:text-text-strong hover:bg-surface-muted transition-colors",
                )}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-md gap-y-sm">
            <div className="flex flex-wrap items-center gap-x-sm gap-y-xs text-caption text-text-muted">
              <span>{DETAIL_PROVIDER_PREFIX} {providerLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{formatRelativeTime(item.updatedAt)}</span>
              <span aria-hidden="true">·</span>
              <span>{tokenSummary(item)}</span>
            </div>
            {item.sentiment && <SentimentBadge report={item.sentiment} />}
          </div>
        </div>

        {/* 본문 — 스크롤 영역. 결론 카드가 패널 폭을 꽉 채운다. */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex w-full flex-col gap-md p-lg">
            <FinalVerdictCard data={item.decision} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
