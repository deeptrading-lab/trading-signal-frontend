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

  // 표 자동 상주 대상 — cli-agent 세션 **전량(상태 무관)**. running·일시정지·완료 모두 DB 기준으로
  // 항상 표에 상주시켜, 브라우저별 localStorage 나 running 여부와 무관하게 **모든 세션이 보이게** 한다
  // (AI 모의투자 목록과 동등 — 단일 소스). 세션 없는 워치 행만 ✕ 로 뺄 수 있고, 세션 행은 상주.
  // 틱 폴링 대상은 runningSessionIds(=running)가 별도로 담당(상주 ≠ 틱).
  const activeStocks = useMemo(
    () => cliSessions.map(intradaySessionStock).filter((stock) => stock.ticker),
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
