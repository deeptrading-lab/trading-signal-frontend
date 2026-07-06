"use client";

import { motion } from "motion/react";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import { VerdictDetails } from "./VerdictDetails";
import { StreamBox } from "./PhaseStream";
import type { AgentState, FinalDecision } from "@/lib/types/stock/aiAnalysis";

/**
 * ④ 최종 판정 페이즈 본문 — 완료 시 판정 **상세**(`VerdictDetails`: 근거·전략·전망·강점/리스크),
 * 도출 중이면(PHASE 2) 노스스타 `.stream-box`(portfolio_manager 라이브 토큰). 오류·재개는 상위 PhaseRow
 * 어포던스가 일괄 담당한다. 단일 에이전트라 pip·eta 없이 stream-box 하나만 둔다.
 *
 * 판정 라벨·신호강도·목표/손절/손익비·기간은 패널 상단 `VerdictHero` 가 이미 담당하므로(글랜스),
 * 이 노드엔 상세만 둔다(글랜스↔상세 분리 — 히어로/상세 중복 제거).
 */
export function VerdictPhaseBody({
  final,
  pmAgent,
}: {
  final: FinalDecision | null;
  pmAgent: AgentState;
}) {
  if (final) {
    return <VerdictDetails data={final} />;
  }

  if (pmAgent.status === "running") {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <StreamBox
          who={COPY.phase.stream.writing(COPY.phase.label.verdict)}
          text={pmAgent.streamingChunk}
          fallback={COPY.progress.portfolio_manager[0]}
        />
      </motion.div>
    );
  }

  return null;
}
