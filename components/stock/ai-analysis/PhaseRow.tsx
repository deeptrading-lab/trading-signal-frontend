"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Check, AlertCircle, ChevronDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import type { AgentFailReason } from "@/lib/types/stock/aiAnalysis";
import type { PhaseStatus } from "@/lib/types/stock/aiPhases";

/**
 * 페이즈 타임라인 한 행 — 좌측 상태 노드 + 세로 레일 + (펼침) 헤더·본문.
 *
 * 회색 12-칩 스트립을 대체하는 4-페이즈 스캐폴딩. 상태 노드는 대기(빈 링)/진행(맥박)/완료(체크)/
 * 오류(경고)를 그리고 role="img"+aria-label 로 상태를 노출한다. 헤더는 aria-expanded 토글이며,
 * ★ **에러 재개 어포던스**(칩 클릭 → resume 대체)를 오류 행에 재배치한다(누락 시 회귀).
 *
 * 완료 색은 accent-vivid(파랑) — 이 디자인 시스템에 초록 성공 토큰이 없어 기존 완료 컨벤션
 * (AnalystCard 의 accent-vivid 체크)을 승계한다.
 */

interface PhaseRowProps {
  label: string;
  status: PhaseStatus;
  /** 상태 텍스트(요약·노드 aria) — COPY.phase.status[status]. */
  statusText: string;
  /** 접힘 요약(진행 카운터·감정 칩 등). */
  summary?: ReactNode;
  /** 서브 에이전트 진행 pip(장식 — aria-hidden). */
  pips?: ReactNode;
  isExpanded: boolean;
  /** 펼칠 내용이 있는지(대기 페이즈는 false → 노드+라벨만). */
  canExpand: boolean;
  onToggle: () => void;
  /** 마지막 페이즈면 레일 라인·하단 여백 생략. */
  isLast?: boolean;
  /** 자동 스크롤 타깃(진행 중·최종 도착 페이즈). */
  isActive?: boolean;
  /** 오류 재개 — 오류 상태에서 실패 사유 + resume 컨트롤. */
  error?: { failReason?: AgentFailReason; onResume: () => void; canResume: boolean };
  /** 펼침 본문. */
  children?: ReactNode;
}

function PhaseStatusNode({ status, ariaLabel }: { status: PhaseStatus; ariaLabel: string }) {
  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className={cn(
        "relative z-10 flex h-6 w-6 flex-none items-center justify-center rounded-full",
        status === "pending" && "border-2 border-border-line bg-surface",
        status === "running" && "bg-accent-vivid",
        status === "done" && "bg-accent-vivid",
        status === "error" && "bg-critical",
      )}
    >
      {status === "running" && (
        <>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-vivid opacity-60" />
          <span className="relative h-2 w-2 rounded-full bg-surface" />
        </>
      )}
      {status === "done" && <Check size={14} className="text-surface" />}
      {status === "error" && <AlertCircle size={14} className="text-surface" />}
    </span>
  );
}

export function PhaseRow({
  label,
  status,
  statusText,
  summary,
  pips,
  isExpanded,
  canExpand,
  onToggle,
  isLast,
  isActive,
  error,
  children,
}: PhaseRowProps) {
  const labelClass = cn(
    "text-body-sm-strong flex-none",
    status === "pending" ? "text-text-muted" : "text-text-strong",
  );

  const headerInner = (
    <>
      <span className={labelClass}>{label}</span>
      {summary && <span className="min-w-0 truncate text-caption text-text-muted">{summary}</span>}
      <span className="ml-auto flex flex-none items-center gap-sm" aria-hidden="true">
        {pips}
        {canExpand && (
          <ChevronDown
            size={18}
            className={cn("text-text-muted transition-transform", isExpanded && "rotate-180")}
          />
        )}
      </span>
    </>
  );

  return (
    <div data-phase-active={isActive || undefined} className="flex gap-md">
      {/* 레일 컬럼 — 노드 + (마지막 아니면) 세로 연결선. */}
      <div className="relative flex w-6 flex-none flex-col items-center">
        <PhaseStatusNode status={status} ariaLabel={COPY.phase.nodeAria(label, statusText)} />
        {!isLast && <div className="mt-1 w-px flex-1 bg-border-line" />}
      </div>

      {/* 콘텐츠 컬럼 */}
      <div className={cn("min-w-0 flex-1", !isLast && "pb-lg")}>
        {canExpand ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? COPY.phase.toggleCollapse(label) : COPY.phase.toggleExpand(label)}
            className="group flex min-h-6 w-full cursor-pointer items-center gap-sm text-left"
          >
            {headerInner}
          </button>
        ) : (
          <div className="flex min-h-6 w-full items-center gap-sm">{headerInner}</div>
        )}

        {/* ★ 오류 재개 어포던스 — 실패 사유 + resume(칩 스트립 제거 대체). */}
        {status === "error" && error && (
          <div className="mt-sm flex items-center justify-between gap-md rounded-md bg-critical-soft px-md py-sm">
            <div className="flex min-w-0 items-center gap-sm">
              <AlertCircle size={15} className="flex-none text-critical" />
              <p className="truncate text-caption font-medium text-critical">
                {error.failReason ? COPY.card.failReason[error.failReason] : COPY.card.error}
              </p>
            </div>
            {error.canResume && (
              <button
                type="button"
                onClick={error.onResume}
                className="flex flex-none cursor-pointer items-center gap-1 text-caption font-bold text-critical hover:opacity-70"
              >
                <RefreshCw size={12} /> {COPY.phase.resume}
              </button>
            )}
          </div>
        )}

        {/* 펼침 본문 */}
        {canExpand && isExpanded && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-md">
            {children}
          </motion.div>
        )}
      </div>
    </div>
  );
}
