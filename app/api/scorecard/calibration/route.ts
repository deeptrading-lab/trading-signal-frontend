/**
 * `/api/scorecard/calibration` — confidence 버킷별 실측 보정값(BFF, 읽기 전용).
 *
 * PRD `scorecard-feedback` §(가) [표시 전용].
 * 판정 화면(FinalVerdictCard)이 모델 confidence 옆에 "보정된 신뢰도"(실측 적중률 + 표본수)를
 * 노출하려고 호출한다. 브라우저는 Supabase 를 직접 호출하지 않고 이 BFF 로만 읽는다.
 * - 채점 원장 집계(`summarizeScorecard`) → confidence 차원 셀 → `calibrateAllConfidences`.
 * - n<MIN_SAMPLE_N 버킷은 sufficient:false(클라가 "표본 부족" 표기, 모델 confidence 만).
 * - Vercel 가드 없음 → prod 동작. 미설정/채점 0건이면 빈 배열 + 200(graceful no-op).
 */

import { NextResponse } from "next/server";
import {
  getAllScorecardRows,
  isScorecardStoreConfigured,
} from "@/lib/server/scorecard/scorecardStore";
import { summarizeScorecard } from "@/lib/server/scorecard/summarize";
import { calibrateAllConfidences } from "@/lib/server/scorecard/calibration";
import { MIN_SAMPLE_N } from "@/lib/server/scorecard/constants";
import {
  jsonWithDataSource,
  withTimeout,
  BFF_TIMEOUT_SENTINEL,
} from "@/lib/server/bffUtils";
import type { ScorecardCalibrationResponse } from "@/lib/types/scorecard/scorecard";

const FALLBACK_TIMEOUT_MESSAGE = "신뢰도 보정 조회가 지연되고 있어요. 잠시 후 다시 시도해 주세요.";

export async function GET(): Promise<Response> {
  if (!isScorecardStoreConfigured()) {
    const payload: ScorecardCalibrationResponse = {
      configured: false,
      calibrations: [],
      minSampleN: MIN_SAMPLE_N,
      generatedAt: new Date().toISOString(),
    };
    return jsonWithDataSource(payload, "supabase-unconfigured");
  }

  try {
    const rows = await withTimeout(getAllScorecardRows(), 5_000);
    const cells = summarizeScorecard(rows);
    const payload: ScorecardCalibrationResponse = {
      configured: true,
      calibrations: calibrateAllConfidences(cells),
      minSampleN: MIN_SAMPLE_N,
      generatedAt: new Date().toISOString(),
    };
    return jsonWithDataSource(payload, "supabase");
  } catch (error) {
    if (error instanceof Error && error.message === BFF_TIMEOUT_SENTINEL) {
      return NextResponse.json(
        { error: FALLBACK_TIMEOUT_MESSAGE },
        { status: 504, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { error: "신뢰도 보정 조회 중 오류가 발생했어요." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
