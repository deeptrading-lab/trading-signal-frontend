/**
 * useIntradayPaperWatch — 단타워치 ↔ AI 모의투자(cli-agent) 세션 연결 훅. intraday-paper-watch.
 *
 * 워치의 각 종목에 대응하는 cli-agent 세션을 매핑하고(종목당 1세션, running·최신 우선),
 * "모의 단타 시작"(세션 생성)·진행중 세션 종목(`activeStocks` — 표 자동 상주용)·화면 갱신
 * 폴링 대상(running 세션 id)을 제공한다. 틱 발화는 서버 스케줄러(tickScheduler) 전담.
 */

"use client";

import { useMemo } from "react";
import { usePaperTradingSessions } from "@/hooks/paperTrading/usePaperTradingSessions";
import type {
  PaperTradingSelectedStock,
  PaperTradingSession,
  PaperTradingSessionDetail,
} from "@/lib/types/paperTrading/paperTrading";

/** 세션의 대상 종목(단타 세션은 단일 종목 설계 — intradayTickDecision 이 stocks[0]만 본다). */
export function intradaySessionStock(session: PaperTradingSession): PaperTradingSelectedStock {
  return (
    session.stocks[0] ?? {
      ticker: session.tickers[0] ?? "",
      name: session.tickers[0] ?? "",
    }
  );
}

/** 같은 종목 세션이 여럿이면 running 우선, 그다음 최신 updatedAt 우선. */
function pickBetter(a: PaperTradingSession, b: PaperTradingSession): PaperTradingSession {
  const runA = a.status === "running" ? 1 : 0;
  const runB = b.status === "running" ? 1 : 0;
  if (runA !== runB) return runA > runB ? a : b;
  return a.updatedAt >= b.updatedAt ? a : b;
}

export function useIntradayPaperWatch() {
  const { sessions, isCreating, create } = usePaperTradingSessions();

  const cliSessions = useMemo(
    () => sessions.filter((session) => session.decisionProvider === "cli-agent"),
    [sessions],
  );

  const sessionByTicker = useMemo(() => {
    const map = new Map<string, PaperTradingSession>();
    for (const session of cliSessions) {
      const ticker = intradaySessionStock(session).ticker;
      if (!ticker) continue;
      const prev = map.get(ticker);
      map.set(ticker, prev ? pickBetter(prev, session) : session);
    }
    return map;
  }, [cliSessions]);

  // 진행중(running) 세션 종목 — 워치 로컬 상태와 무관하게 **표에 자동 상주**시킨다(피드백:
  // 페이지 이동 후에도 표 유지). 일시정지·완료 세션은 상주 대상이 아니라 ✕ 로 표에서 뺄 수
  // 있다(피드백) — 세션 기록은 남고, 같은 종목을 다시 추가하면 그 세션의 재개 버튼으로 이어진다.
  const activeStocks = useMemo(
    () =>
      cliSessions
        .filter((session) => session.status === "running")
        .map(intradaySessionStock)
        .filter((stock) => stock.ticker),
    [cliSessions],
  );

  // 화면 갱신 폴링 대상 — running 세션 전부(활성 세션은 항상 표에 있으므로 곧 보이는 행).
  // 틱 발화는 서버 스케줄러 전담. 세션 수명은 일시정지/완료로 관리.
  const runningSessionIds = useMemo(
    () => cliSessions.filter((session) => session.status === "running").map((session) => session.id),
    [cliSessions],
  );

  const start = (
    stock: PaperTradingSelectedStock,
    initialCash: number,
    tickIntervalMinutes: number,
  ): Promise<PaperTradingSessionDetail> =>
    create({
      name: `단타 모의 · ${stock.name}`,
      tickers: [stock.ticker],
      stocks: [stock],
      initialCash,
      targetReturnPct: 5,
      riskMode: "balanced",
      decisionProvider: "cli-agent",
      tickIntervalMinutes,
    });

  return { sessionByTicker, activeStocks, runningSessionIds, isCreating, start };
}
