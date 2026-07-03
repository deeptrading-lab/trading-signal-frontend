/**
 * useIntradayPaperWatch — 단타워치 ↔ AI 모의투자(cli-agent) 세션 연결 훅. intraday-paper-watch.
 *
 * 워치의 각 종목에 대응하는 cli-agent 세션을 매핑하고(종목당 1세션, running·최신 우선),
 * "모의 단타 시작"(세션 생성)과 자동 틱 대상(running 세션 id 목록)을 제공한다.
 * 세션 저장은 서버 in-memory(dev 재시작 시 소멸) — 워치 로컬 상태와 무관하게 세션이 살아있을 수
 * 있으므로, 워치에 없는 running 세션은 `runningOrphans` 로 노출해 칩으로 복원한다.
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

export function useIntradayPaperWatch(watchTickers: string[]) {
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

  // 진행 중인데 워치에 없는 세션 — 새로고침으로 워치가 비어도 칩으로 복원.
  const runningOrphans = useMemo(
    () =>
      cliSessions.filter(
        (session) =>
          session.status === "running" &&
          !watchTickers.includes(intradaySessionStock(session).ticker),
      ),
    [cliSessions, watchTickers],
  );

  // 화면 갱신 폴링 대상 — 워치에 올라온 종목의 running 세션(보이는 행의 상세만 무효화).
  // 틱 발화는 서버 스케줄러가 running 세션 전부를 전담하므로(화면 무관) 안전 필터가 아니라
  // 조회 범위 최적화다. 원치 않는 세션은 일시정지/완료로 멈춘다.
  const runningSessionIds = useMemo(
    () =>
      cliSessions
        .filter(
          (session) =>
            session.status === "running" &&
            watchTickers.includes(intradaySessionStock(session).ticker),
        )
        .map((session) => session.id),
    [cliSessions, watchTickers],
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

  return { sessionByTicker, runningOrphans, runningSessionIds, isCreating, start };
}
