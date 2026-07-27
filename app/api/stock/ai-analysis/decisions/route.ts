/**
 * `/api/stock/ai-analysis/decisions` — 저장된 AI 분석 카드 요약 + 카드별 토큰 합계 (BFF, 읽기 전용).
 *
 * 브라우저는 Supabase를 직접 호출하지 않고 이 BFF를 통해 "지금까지 분석한 종목들"을 최신순으로 읽는다.
 * - DB 함수가 최신 결론 20건의 카드 필드만 projection하고, ai_agent_usage 최신 run 합계도 DB 안에서
 *   계산한다. 원본 decision/sentiment/usage 1,000행은 네트워크로 전송하지 않는다.
 * - 분석 실행(POST /api/stock/ai-analysis)과 달리 Vercel 가드 없음 → prod 에서도 읽기 동작.
 * - 권한: 로그인 유저 전체(analyze-open-access — 메뉴 개방과 함께 admin 가드 제거). 로그인 자체는
 *   전역 proxy 게이트가 담당. 파괴적 작업(삭제)은 별도 라우트의 superadmin 가드 유지.
 */

import { NextResponse } from "next/server";
import {
  getAIDecisionCardSummaries,
  isAIDecisionStoreConfigured,
} from "@/lib/server/ai/decisionStore";
import { getActiveJobs } from "@/lib/server/ai/queueStore";
import { mergeActiveJobs } from "@/lib/server/ai/inflightMerge";
import {
  jsonWithDataSource,
  withTimeout,
  BFF_TIMEOUT_SENTINEL,
} from "@/lib/server/bffUtils";
import type { AIDecisionListResponse } from "@/lib/types/stock/aiAnalysisDecisions";

const FALLBACK_TIMEOUT_MESSAGE = "분석 결과 조회가 지연되고 있어요. 잠시 후 다시 시도해 주세요.";

export async function GET(): Promise<Response> {
  try {
    const [decisions, activeJobs] = await withTimeout(
      Promise.all([
        getAIDecisionCardSummaries(),
        getActiveJobs(),
      ]),
      5_000,
    );

    // 완료 결과 + 활성 작업 합성 — 재분석중은 item.reanalysis, 결과없는 진행중은 inflight 플레이스홀더(순수 함수).
    const { items, inflight } = mergeActiveJobs(decisions, activeJobs ?? []);

    const payload: AIDecisionListResponse = {
      configured: isAIDecisionStoreConfigured(),
      items,
      inflight,
      generatedAt: new Date().toISOString(),
    };
    return jsonWithDataSource(
      payload,
      payload.configured ? "supabase" : "supabase-unconfigured",
    );
  } catch (error) {
    if (error instanceof Error && error.message === BFF_TIMEOUT_SENTINEL) {
      return NextResponse.json(
        { error: FALLBACK_TIMEOUT_MESSAGE },
        { status: 504, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { error: "분석 결과 조회 중 오류가 발생했어요." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
