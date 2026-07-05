"use client";

import { motion } from "motion/react";
import { PMLoadingCard } from "./PMLoadingCard";
import { VerdictDetails } from "./VerdictDetails";
import type { AgentState, FinalDecision } from "@/lib/types/stock/aiAnalysis";

/**
 * ④ 최종 판정 페이즈 본문 — 완료 시 판정 **상세**(`VerdictDetails`: 근거·전략·전망·강점/리스크),
 * 도출 중이면 `PMLoadingCard`(스트리밍). 오류·재개는 상위 PhaseRow 의 어포던스가 일괄 담당한다.
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
        <PMLoadingCard streamingChunk={pmAgent.streamingChunk} />
      </motion.div>
    );
  }

  return null;
}
