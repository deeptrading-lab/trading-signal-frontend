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
 * 완료 색은 노스스타 done 초록(`signal-done` / `signal-done-soft`) — 노드·연결선·상태 pill 이
 * 초록 성공 톤을 공유한다(진행=accent 파랑과 시각 대비).
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
        // 노스스타 `.node` — 24px 원. 대기(빈 링+점)/진행(accent+soft 링+blink 점)/완료(done-soft+초록 체크)/오류(critical).
        "relative z-10 flex h-6 w-6 flex-none items-center justify-center rounded-full transition-all",
        status === "pending" && "border-2 border-text-muted/20 bg-surface",
        status === "running" && "bg-accent-vivid ring-4 ring-accent-vivid-soft",
        status === "done" && "bg-signal-done-soft",
        status === "error" && "bg-critical",
      )}
    >
      {/* `.node.wait::after` — 대기 6px 점. */}
      {status === "pending" && <span className="h-1.5 w-1.5 rounded-full bg-text-muted/20" />}
      {/* `.node.run::after` — 진행 8px 흰 점(blink). soft 링은 ring 유틸이 담당. */}
      {status === "running" && <span className="h-2 w-2 animate-pulse rounded-full bg-surface" />}
      {/* `.node.done::after` — 완료 체크(done 초록). */}
      {status === "done" && <Check size={14} className="text-signal-done" />}
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

  // 노스스타 `.p-status` — 상태 pill(11px w700). done=done/done-soft · run=accent/accent-soft · wait=muted/surface.
  const statusPill = (
    <span
      className={cn(
        "flex-none rounded-pill px-2 py-0.5 text-caption font-bold",
        status === "done" && "bg-signal-done-soft text-signal-done",
        status === "running" && "bg-accent-vivid-soft text-accent-vivid",
        status === "pending" && "bg-surface-muted text-text-muted",
        status === "error" && "bg-critical-soft text-critical",
      )}
    >
      {statusText}
    </span>
  );

  const headerInner = (
    <>
      <span className={labelClass}>{label}</span>
      {summary && <span className="min-w-0 truncate text-caption text-text-muted">{summary}</span>}
      {statusPill}
      <span className="ml-auto flex flex-none items-center gap-2" aria-hidden="true">
        {pips}
        {canExpand && (
          // 노스스타 `.chev` — 24px 히트박스(radius6·hover surface) + open 시 180° 회전.
          <span className="grid h-6 w-6 flex-none place-items-center rounded-sm text-text-muted transition-colors group-hover:bg-surface-muted">
            <ChevronDown size={18} className={cn("transition-transform", isExpanded && "rotate-180")} />
          </span>
        )}
      </span>
    </>
  );

  return (
    <div
      data-phase-active={isActive || undefined}
      className={cn(
        // 노스스타 `.phase`(gap13) + `.phase.is-wait{opacity:.5}` — 대기 페이즈 전체를 흐리게.
        "flex gap-lg transition-opacity",
        status === "pending" && "opacity-50",
      )}
    >
      {/* 레일 컬럼 — 노드 + (마지막 아니면) 세로 연결선. */}
      <div className="relative flex w-6 flex-none flex-col items-center">
        <PhaseStatusNode status={status} ariaLabel={COPY.phase.nodeAria(label, statusText)} />
        {/* `.line`(2px) + `.line.done`(done 초록 opacity .35). */}
        {!isLast && (
          <div
            className={cn(
              "mt-1 w-0.5 flex-1",
              status === "done" ? "bg-signal-done/35" : "bg-border-line",
            )}
          />
        )}
      </div>

      {/* 콘텐츠 컬럼 — `.p-body{padding-bottom:18px}`. */}
      <div className={cn("min-w-0 flex-1", !isLast && "pb-xl")}>
        {canExpand ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? COPY.phase.toggleCollapse(label) : COPY.phase.toggleExpand(label)}
            className="group flex min-h-6 w-full cursor-pointer items-center gap-2 text-left"
          >
            {headerInner}
          </button>
        ) : (
          <div className="flex min-h-6 w-full items-center gap-2">{headerInner}</div>
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
