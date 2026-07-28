/**
 * useIntradayAutopilot — 오토파일럿 런 ↔ 자식 세션 조인 훅. intraday-autopilot.
 *
 * 런(슬롯·로테이션 로그)과 세션 목록을 조인해 슬롯별 손익·런 누적 손익(교체 회수된 완료 자식
 * 포함)을 계산한다. 런 손익 = Σ(자식 portfolioValue − initialCash) — 슬롯 고정 배분(승계 없음)
 * 설계라 자식 세션 단위 합산이 곧 런 성과다.
 */

"use client";

import { useMemo } from "react";
import { useMutationStartAutopilotRun } from "@/hooks/query/useMutationStartAutopilotRun";
import { useMutationStopAutopilotRun } from "@/hooks/query/useMutationStopAutopilotRun";
import { useQueryAutopilotRun } from "@/hooks/query/useQueryAutopilotRun";
import { usePaperTradingSessions } from "@/hooks/paperTrading/usePaperTradingSessions";
import { useQueryPaperTradingSessionDetails } from "@/hooks/query/useQueryPaperTradingSessionDetails";
import { useMutationRespondAutopilotGuide } from "@/hooks/query/useMutationRespondAutopilotGuide";
import { buildGuideHoldings, buildIntradayGuideItems } from "@/lib/intraday/guideFeed";
import type {
  AutopilotRun,
  StartAutopilotRunRequest,
} from "@/lib/types/paperTrading/autopilot";
import type { PaperTradingSession } from "@/lib/types/paperTrading/paperTrading";

export type AutopilotRunPnl = {
  /** 런에 귀속된 자식 세션 수(교체 회수분 포함). */
  childCount: number;
  /** Σ(자식 portfolioValue − initialCash), 원. */
  pnlKrw: number;
  /** pnlKrw / Σ(initialCash) ×100. 자식 없으면 0. */
  pnlPct: number;
};

export function computeRunPnl(run: AutopilotRun | null, sessions: PaperTradingSession[]): AutopilotRunPnl {
  if (!run) return { childCount: 0, pnlKrw: 0, pnlPct: 0 };
  const children = sessions.filter((session) => session.autopilotRunId === run.id);
  const invested = children.reduce((s, c) => s + c.initialCash, 0);
  const pnlKrw = children.reduce((s, c) => s + (c.portfolioValue - c.initialCash), 0);
  return {
    childCount: children.length,
    pnlKrw,
    pnlPct: invested > 0 ? (pnlKrw / invested) * 100 : 0,
  };
}

export function useIntradayAutopilot() {
  const runQuery = useQueryAutopilotRun();
  const { sessions } = usePaperTradingSessions();
  const startMutation = useMutationStartAutopilotRun();
  const stopMutation = useMutationStopAutopilotRun();
  const respondMutation = useMutationRespondAutopilotGuide();

  const run = runQuery.data?.run ?? null;

  const childSessionById = useMemo(() => {
    const map = new Map<string, PaperTradingSession>();
    if (!run) return map;
    for (const session of sessions) {
      if (session.autopilotRunId === run.id) map.set(session.id, session);
    }
    return map;
  }, [run, sessions]);

  const runPnl = useMemo(() => computeRunPnl(run, sessions), [run, sessions]);
  const childSessionIds = useMemo(
    () => sessions.filter((session) => session.autopilotRunId === run?.id).map((session) => session.id),
    [run?.id, sessions],
  );
  const detailQueries = useQueryPaperTradingSessionDetails(childSessionIds);
  const details = detailQueries.flatMap((query) => (query.data ? [query.data] : []));
  const guideItems = useMemo(() => buildIntradayGuideItems(run, details), [run, details]);
  const guideHoldings = useMemo(() => buildGuideHoldings(run?.guideResponses), [run?.guideResponses]);

  return {
    run,
    /** 스크리너 가용 여부(KIS prod) — false 면 "종목 선정 불가" 경고 배지. */
    kisReady: runQuery.data?.kisReady ?? true,
    childSessionById,
    runPnl,
    isLoading: runQuery.isLoading,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
    isResponding: respondMutation.isPending,
    respondingGuideId: respondMutation.variables?.guideId ?? null,
    guideItems,
    guideHoldings,
    guideLoading: detailQueries.some((query) => query.isLoading),
    start: (payload: StartAutopilotRunRequest) => startMutation.mutateAsync(payload),
    stop: (runId: string, options: { completeChildSessions?: boolean } = {}) =>
      stopMutation.mutateAsync({ runId, ...options }),
    respond: (
      runId: string,
      guideId: string,
      response: "performed" | "passed",
    ) => respondMutation.mutateAsync({ runId, guideId, response }),
  };
}
