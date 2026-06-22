/**
 * 판정 카드용 신뢰도 캘리브레이션 도메인 훅 — confidence 1건 lookup.
 *
 * PRD `scorecard-feedback` §(가). FinalVerdictCard 가 자기 confidence(HIGH/MEDIUM/LOW)에 해당하는
 * 실측 보정값을 한 건 받아 "보정된 신뢰도"를 그린다.
 * - 데이터 게이팅: 미설정·미로딩·표본 없음이면 `null` 반환 → 카드는 모델 confidence 만 노출(무회귀).
 * - TanStack Query 인터페이스(useQuery)는 누출하지 않고 lookup 결과만 노출한다(frontend.md).
 *
 * @param enabled 판정 카드가 보일 때만 켜 불필요한 호출을 줄인다(기본 true).
 */

"use client";

import { useMemo } from "react";
import { useQueryScorecardCalibration } from "@/hooks/query/useQueryScorecardCalibration";
import type {
  ConfidenceCalibration,
  ScorecardConfidence,
} from "@/lib/types/scorecard/scorecard";

export interface UseConfidenceCalibrationResult {
  /** confidence 버킷 → 보정값. 표본 없는 버킷은 미포함. */
  getCalibration: (confidence: ScorecardConfidence) => ConfidenceCalibration | null;
  /** 게이트 기준 표본수(안내 문구용). */
  minSampleN: number;
}

export function useConfidenceCalibration(
  enabled = true,
): UseConfidenceCalibrationResult {
  const { data } = useQueryScorecardCalibration(enabled);

  return useMemo(() => {
    const byConfidence = new Map<ScorecardConfidence, ConfidenceCalibration>();
    for (const c of data?.calibrations ?? []) {
      byConfidence.set(c.confidence, c);
    }
    return {
      getCalibration: (confidence) => byConfidence.get(confidence) ?? null,
      minSampleN: data?.minSampleN ?? 0,
    };
  }, [data]);
}
