"use client";

import { motion } from "motion/react";
import { PMLoadingCard } from "./PMLoadingCard";
import { FinalVerdictCard } from "./FinalVerdictCard";
import { useConfidenceCalibration } from "@/hooks/scorecard/useConfidenceCalibration";
import type { AgentState, FinalDecision } from "@/lib/types/stock/aiAnalysis";

/**
 * ④ 최종 판정 페이즈 본문 — 완료 시 전체 `FinalVerdictCard`(근거·전략·전망·강점/리스크),
 * 도출 중이면 `PMLoadingCard`(스트리밍). 오류·재개는 상위 PhaseRow 의 어포던스가 일괄 담당한다.
 *
 * 히어로는 글랜스(판정 라벨 + 신호강도 + 목표/손절/손익비)만, 이 본문이 전체 상세다(글랜스↔전체 분리).
 */
export function VerdictPhaseBody({
  final,
  pmAgent,
}: {
  final: FinalDecision | null;
  pmAgent: AgentState;
}) {
  // 보정된 신뢰도(scorecard-feedback (가)) — 표시 전용·무회귀. 데이터 없으면 null(카드가 모델 confidence 만).
  const { getCalibration, minSampleN } = useConfidenceCalibration();

  if (final) {
    return (
      <FinalVerdictCard
        data={final}
        calibration={getCalibration(final.confidence)}
        calibrationMinSampleN={minSampleN}
      />
    );
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
