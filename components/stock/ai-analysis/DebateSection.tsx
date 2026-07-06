"use client";

import { useMemo, type ReactNode } from "react";
import { motion } from "motion/react";
import { MessageSquare } from "lucide-react";
import { DEBATE_ROUNDS } from "@/lib/types/stock/aiAnalysis";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import type { AgentState, DebateMessage } from "@/lib/types/stock/aiAnalysis";
import { DebateMsgCard } from "./DebateMsgCard";

interface DebateSectionProps {
  debate: DebateMessage[];
  debatingSide: "bull" | "bear" | null;
  bullAgent: AgentState;
  bearAgent: AgentState;
  onExpand: (title: string, content: string) => void;
}

/** 공통 헤더 — MessageSquare + 제목 + 라운드 카운터. */
function DebateHeader({ currentRound }: { currentRound: number }) {
  return (
    <div className="flex items-center gap-sm">
      <MessageSquare size={14} className="text-text-muted" />
      <span className="text-body-sm-strong text-text-strong">{COPY.debate.title}</span>
      <span className="ml-auto text-caption text-text-muted">
        {COPY.debate.roundCounter(currentRound, DEBATE_ROUNDS)}
      </span>
    </div>
  );
}

/**
 * ② 토론 페이즈 본문 — 강세 vs 약세 2라운드.
 *
 * 진행/완료가 **같은 세로 스택 버블**(노스스타 `.round`: R# 좌측 + 강세 위 / 약세 반박 아래)을 그린다.
 * `debate` 배열은 확정 발화 + 현재 스트리밍 발화(isStreaming)를 모두 담으므로, 각 라운드 버블이
 *   - 완료 발화면 컴팩트 요약(클릭 전체보기),
 *   - 활성 발화면 **라이브 토큰이 실시간으로 채워지는** 버블(DebateMsgCard 가 status별로 그림),
 *   - 차례이지만 아직 첫 청크 전(placeholder, AnalystsPhaseBody 의 running 행과 동일한 발상)이면
 *     빈 스트리밍 버블(fallback 문구 + 커서)로 즉시 표시,
 *   - 미착수 라운드면 아직 미표시
 * 로 자연스럽게 전이한다(단일 stream-box + pip 제거).
 *
 * CLI 에 따라 `debate_stream` 청크가 토큰 단위가 아니라 응답 완료 시 한 덩어리로만 오는 경우가 있어
 * (claude/codex 공통), 그 사이 공백 구간엔 `debate` 배열에 아무 항목도 없다. `progress running` 은
 * agent 단위로 오므로, 그 신호만으로 "지금 차례인 화자"를 판단해 placeholder 버블을 미리 마운트한다.
 */
export function DebateSection({
  debate,
  debatingSide,
  bullAgent,
  bearAgent,
  onExpand,
}: DebateSectionProps) {
  const bullMsgs = useMemo(() => debate.filter((d) => d.speaker === "bull"), [debate]);
  const bearMsgs = useMemo(() => debate.filter((d) => d.speaker === "bear"), [debate]);

  // 토론 미착수(강세 연구원 시작 전) — 아직 표시할 발화 없음.
  if (bullAgent.status === "pending") return null;

  const currentRound = Math.max(bullMsgs.length, bearMsgs.length, 1);

  const rounds: ReactNode[] = [];
  for (let round = 1; round <= DEBATE_ROUNDS; round++) {
    const bullMsg = bullMsgs.find((m) => m.round === round);
    const bearMsg = bearMsgs.find((m) => m.round === round);
    // bull 차례: 이 라운드가 다음 순번(직전 라운드까지 완결)이고 진행중이면 첫 청크 전이어도 placeholder.
    const bullPending =
      !bullMsg && bullAgent.status === "running" && round === bullMsgs.length + 1;
    // bear 차례: 같은 라운드 bull 이 이미 나왔고 진행중이면 placeholder.
    const bearPending =
      !bearMsg && Boolean(bullMsg) && bearAgent.status === "running" && round === bearMsgs.length + 1;

    // 이 라운드도, 이후 라운드도 아직 미착수 — 여기서 중단(라운드는 순차 진행이므로 이후도 전부 미착수).
    if (!bullMsg && !bearMsg && !bullPending) break;

    rounds.push(
      <div key={round} className="grid grid-cols-[30px_1fr] items-start gap-sm">
        {/* 노스스타 `.rn` — surface 배경 boxed 라운드 라벨(상단 정렬). */}
        <span className="rounded-sm bg-surface-muted py-0.5 text-center text-caption font-black text-text-muted">
          R{round}
        </span>
        {/* 노스스타 `.bubbles`(세로 스택) — 강세 위 / 약세 반박 아래. */}
        <div className="flex min-w-0 flex-col gap-1.5">
          {bullMsg && (
            <DebateMsgCard
              msg={bullMsg}
              debatingSide={debatingSide}
              onExpand={onExpand}
              whoLabel={COPY.debate.bubbleWho.bull}
            />
          )}
          {!bullMsg && bullPending && (
            <DebateMsgCard
              msg={{ speaker: "bull", content: "", isStreaming: true, round }}
              debatingSide={debatingSide}
              onExpand={onExpand}
              whoLabel={COPY.debate.bubbleWho.bull}
              forceActive
            />
          )}
          {bearMsg && (
            <DebateMsgCard
              msg={bearMsg}
              debatingSide={debatingSide}
              onExpand={onExpand}
              whoLabel={COPY.debate.bubbleWho.bear}
            />
          )}
          {!bearMsg && bearPending && (
            <DebateMsgCard
              msg={{ speaker: "bear", content: "", isStreaming: true, round }}
              debatingSide={debatingSide}
              onExpand={onExpand}
              whoLabel={COPY.debate.bubbleWho.bear}
              forceActive
            />
          )}
        </div>
      </div>,
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-col gap-md border-t border-border-line pt-lg">
        <DebateHeader currentRound={currentRound} />

        {/* 노스스타 `.rounds`(세로 gap) — 라운드마다 `.round`(grid 30px 1fr): R# 박스 + 버블 스택. */}
        <div className="flex flex-col gap-sm">{rounds}</div>
      </div>
    </motion.div>
  );
}
