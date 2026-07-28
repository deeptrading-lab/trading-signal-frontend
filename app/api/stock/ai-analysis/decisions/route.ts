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
  getDecisionThesisLevels,
  isAIDecisionStoreConfigured,
} from "@/lib/server/ai/decisionStore";
import { fetchIntstockMultprice, isKisConfigured, resolveKisEnv } from "@/lib/api/kis";
import { evaluateThesisBreach } from "@/lib/stock/thesisBreach";
import { getRecentOutcomeRows } from "@/lib/server/scorecard/scorecardStore";
import { resolveDecisionOutcome } from "@/lib/stock/decisionOutcome";
import { getActiveJobs } from "@/lib/server/ai/queueStore";
import { mergeActiveJobs } from "@/lib/server/ai/inflightMerge";
import {
  jsonWithDataSource,
  withTimeout,
  BFF_TIMEOUT_SENTINEL,
} from "@/lib/server/bffUtils";
import type {
  AIDecisionListItem,
  AIDecisionListResponse,
} from "@/lib/types/stock/aiAnalysisDecisions";

const FALLBACK_TIMEOUT_MESSAGE = "분석 결과 조회가 지연되고 있어요. 잠시 후 다시 시도해 주세요.";

/**
 * 배지용 시세 조회 예산 — 목록 응답을 붙잡지 않도록 짧게. 초과 시 배지 없이 진행.
 * 목록 조회(5s) **뒤에 순차** 실행이라 이 값이 곧 최악 지연 증가분이다.
 */
const BREACH_QUOTE_TIMEOUT_MS = 1_500;

/** 채점 원장 조회 예산 — Supabase 단일 쿼리라 짧게. 초과 시 결과 표시 없이 진행. */
const OUTCOME_QUERY_TIMEOUT_MS = 1_500;

/** 국내 6자리 티커만 배치 대상 — US 등 비정형 티커가 섞이면 KIS 1콜이 통째로 실패해 전 배지가 사라진다. */
const KR_TICKER_RE = /^\d{6}$/;

/**
 * 각 카드에 테제 무효화 여부를 붙인다(in-place). 실패·미설정·타임아웃이면 조용히 no-op —
 * 배지는 부가 정보이므로 목록 응답을 절대 막지 않는다.
 *
 * 시세는 `intstock_multprice` 일괄 1콜(soft cap 30, 카드 목록은 최대 20건이라 1콜로 덮임).
 * KIS 미설정/비-prod 환경에서는 조회를 시도하지 않는다(mock 시세로 오배지 방지).
 */
async function attachThesisBreach(items: AIDecisionListItem[]): Promise<void> {
  try {
    if (items.length === 0) return;
    if (!isKisConfigured() || resolveKisEnv() !== "prod") return;

    const tickers = items.map((i) => i.ticker).filter((t) => KR_TICKER_RE.test(t));
    if (tickers.length === 0) return;

    const [levels, quotes] = await withTimeout(
      Promise.all([getDecisionThesisLevels(tickers), fetchIntstockMultprice(tickers)]),
      BREACH_QUOTE_TIMEOUT_MS,
    );
    const priceByTicker = new Map(quotes.map((q) => [q.ticker, q.price]));

    for (const item of items) {
      const level = levels.get(item.ticker);
      if (!level) continue;
      item.thesisBreach = evaluateThesisBreach(level, priceByTicker.get(item.ticker));
    }
  } catch (error) {
    // 타임아웃·시세 실패·부분 응답 — 배지 없이 진행하되 **조용히 넘기지 않는다**
    // (이 PR 의 원칙: 폴백은 허용하되 관측 가능해야 한다).
    console.warn(
      "[ai-decisions] 테제 무효화 배지 계산 skip —",
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * 각 카드에 채점 결과를 붙인다(in-place). 실패·미설정이면 조용히 no-op — 부가 정보라 목록을 막지 않는다.
 * 원장은 append(실행마다 1행)이고 카드는 최신 결론 1건이라, 매칭·선택은 순수 로직에 위임한다.
 */
async function attachOutcome(items: AIDecisionListItem[]): Promise<void> {
  try {
    if (items.length === 0) return;
    const rows = await withTimeout(
      getRecentOutcomeRows(items.map((i) => i.ticker)),
      OUTCOME_QUERY_TIMEOUT_MS,
    );
    if (rows.length === 0) return;

    const byTicker = new Map<string, typeof rows>();
    for (const row of rows) {
      const list = byTicker.get(row.ticker) ?? [];
      list.push(row);
      byTicker.set(row.ticker, list);
    }
    for (const item of items) {
      const candidates = byTicker.get(item.ticker);
      if (!candidates) continue;
      item.outcome = resolveDecisionOutcome(candidates, item.updatedAt);
    }
  } catch (error) {
    console.warn(
      "[ai-decisions] 채점 결과 부착 skip —",
      error instanceof Error ? error.message : error,
    );
  }
}

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

    // 테제 무효화 배지 — 라이브 시세 대비 무효화/손절 라인 돌파 여부. 전 구간 fail-soft:
    // 시세·레벨 조회가 실패하거나 느려도 배지만 빠지고 목록은 정상 응답한다(부가 정보).
    await attachThesisBreach(items);

    // 채점 결과(이 판단이 맞았나) — 원장에서 같은 실행 행을 찾아 가장 성숙한 시점 1건을 붙인다.
    await attachOutcome(items);

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
