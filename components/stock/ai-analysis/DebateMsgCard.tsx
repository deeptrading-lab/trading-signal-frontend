"use client";

import { cn } from "@/lib/utils/cn";
import { ChevronRight } from "lucide-react";
import { stripMarkdown } from "@/lib/utils/stripMarkdown";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import { InlineStream } from "./PhaseStream";
import type { DebateMessage } from "@/lib/types/stock/aiAnalysis";

interface DebateMsgCardProps {
  msg: DebateMessage;
  debatingSide: "bull" | "bear" | null;
  onExpand: (title: string, content: string) => void;
  /**
   * 세로 스택 뷰의 방향 라벨(`.who`) — "강세" 위 / "약세 반박" 아래(라운드 번호는 좌측 `.rn` 박스가 담당).
   * 미전달 시 라운드 마커로 폴백.
   */
  whoLabel?: string;
  /**
   * true 면 `debatingSide` 일치 여부와 무관하게 항상 활성(스트리밍) 버블로 그린다.
   * 첫 토큰이 아직 안 왔지만 해당 발화자가 진행 중임을 미리 보여줄 placeholder 용도.
   */
  forceActive?: boolean;
}

/**
 * 노스스타 `.bub` — 컴팩트 방향 버블. `.who` 방향 라벨 인라인 + 핵심 한 줄(요약/라이브).
 *
 * - 완료 발화: who + 요약(2줄 클램프). 긴 원문은 **버블 전체 클릭**으로 전체보기(전체보기 버튼 최소화 → 우측 소형 chevron).
 * - 활성 발화: who + **라이브 토큰 흐름 + 커서**(방향 톤). 버블이 실시간으로 채워진다.
 *
 * 색은 앱 토큰만 — bull=signal-up/up-soft · bear=signal-down/down-soft. 커서는 방향 톤(motion-reduce 정지).
 */
export function DebateMsgCard({ msg, debatingSide, onExpand, whoLabel, forceActive }: DebateMsgCardProps) {
  const isBull = msg.speaker === "bull";
  const isStreaming = msg.isStreaming && (forceActive || debatingSide === msg.speaker);
  const who = whoLabel ?? COPY.debate.roundMarker(msg.round);

  const bubbleClass = cn(
    // `.bub`(radius·border1) + `.bub.bull/.bear`(방향 soft 배경 + 방향 톤 테두리).
    "rounded-sm border px-md py-1.5",
    isBull ? "border-signal-up/20 bg-signal-up-soft" : "border-signal-down/20 bg-signal-down-soft",
    isStreaming && (isBull ? "ring-1 ring-inset ring-signal-up/40" : "ring-1 ring-inset ring-signal-down/40"),
  );
  const whoClass = cn(
    "mr-1.5 font-extrabold",
    isBull ? "text-signal-up" : "text-signal-down",
  );

  // ── 활성 발화 — 버블에 라이브 토큰 + 커서(방향 톤). ──
  if (isStreaming) {
    return (
      <div className={bubbleClass}>
        <p className="text-caption leading-relaxed text-text-strong">
          <span className={whoClass}>{who}</span>
          <InlineStream
            text={msg.content}
            fallback={COPY.debate[isBull ? "bullWriting" : "bearWriting"]}
            maxChars={150}
            cursorTone={isBull ? "bg-signal-up" : "bg-signal-down"}
          />
        </p>
      </div>
    );
  }

  // ── 완료 발화 — 컴팩트 한 줄(who + 요약). 버블 전체 클릭 = 전체보기(우측 chevron 은 최소 어포던스). ──
  const previewText = stripMarkdown(msg.content);
  const inner = (
    <p className="min-w-0 flex-1 text-caption leading-relaxed text-text-strong line-clamp-2">
      <span className={whoClass}>{who}</span>
      {previewText}
    </p>
  );

  return msg.content ? (
    <button
      type="button"
      onClick={() => onExpand(COPY.debate.detailTitle(msg.speaker, msg.round), msg.content)}
      className={cn(bubbleClass, "flex w-full items-start gap-1 text-left transition-[filter] hover:brightness-95")}
    >
      {inner}
      <ChevronRight size={12} className="mt-0.5 flex-none text-text-muted" />
    </button>
  ) : (
    <div className={bubbleClass}>{inner}</div>
  );
}
