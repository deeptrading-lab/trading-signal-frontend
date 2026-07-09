/**
 * useIntradayPaperWatch — 단타워치 ↔ AI 모의투자(cli-agent) 세션 연결 훅. intraday-paper-watch.
 *
 * 오늘(KST) 워치의 각 종목에 대응하는 cli-agent 세션을 매핑하고,
 * "모의 단타 시작"(세션 생성)·오늘 세션 종목(`todaySessionStocks` — 표 자동 보존용)·화면 갱신
 * 폴링 대상(오늘 running 세션 id)을 제공한다. 과거 세션은 오늘 구성 목록에 섞지 않는다.
 * 틱 발화는 서버 스케줄러(tickScheduler) 전담.
 */

"use client";

import { useMemo } from "react";
import { usePaperTradingSessions } from "@/hooks/paperTrading/usePaperTradingSessions";
import { isoToKstDate, todayKstDate } from "@/lib/api/toss/kst";
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

function isSessionStartedOnKstDate(session: PaperTradingSession, dateKey: string): boolean {
  return isoToKstDate(session.startedAt ?? session.createdAt) === dateKey;
}

export function buildTodaySessionByTicker(
  sessions: PaperTradingSession[],
  todayKey: string,
): Map<string, PaperTradingSession> {
  const map = new Map<string, PaperTradingSession>();
  for (const session of sessions) {
    if (!isSessionStartedOnKstDate(session, todayKey)) continue;
    const ticker = intradaySessionStock(session).ticker;
    if (!ticker) continue;
    const prev = map.get(ticker);
    map.set(ticker, prev ? pickBetter(prev, session) : session);
  }
  return map;
}

export function buildTodaySessionStocks(
  sessions: PaperTradingSession[],
  todayKey: string,
): PaperTradingSelectedStock[] {
  return sessions
    .filter((session) => isSessionStartedOnKstDate(session, todayKey))
    .map(intradaySessionStock)
    .filter((stock) => stock.ticker);
}

export function filterPastSessions(
  sessions: PaperTradingSession[],
  todayKey: string,
): PaperTradingSession[] {
  return sessions.filter((session) => !isSessionStartedOnKstDate(session, todayKey));
}

export function useIntradayPaperWatch() {
  const { sessions, currentOperator, isCreating, create } = usePaperTradingSessions();

  // 렌더 중 Date.now 직접 호출을 피하려고 마운트 시점의 KST 오늘 키를 memoize 한다.
  // 자정이 지나면 새로고침/재방문으로 갱신되는 화면이라 이 정도면 충분하다.
  const todayKey = useMemo(() => todayKstDate(), []);

  const cliSessions = useMemo(
    () => sessions.filter((session) => session.decisionProvider === "cli-agent"),
    [sessions],
  );

  // 행의 "이미 모의투자 중" 판정은 오늘(KST) 세션만 본다. 과거 running 세션이 남아 있어도
  // 오늘 같은 종목을 새로 시작할 수 있어야 한다.
  const sessionByTicker = useMemo(
    () => buildTodaySessionByTicker(cliSessions, todayKey),
    [cliSessions, todayKey],
  );

  // 표 자동 보존 대상 — 오늘(KST) cli-agent 세션만. 과거 세션은 히스토리일 뿐 오늘 신규 구성 목록에
  // 끌어오지 않는다. 브라우저가 달라도 오늘 시작한 세션 종목은 표에서 사라지지 않게 보존한다.
  const todaySessionStocks = useMemo(
    () => buildTodaySessionStocks(cliSessions, todayKey),
    [cliSessions, todayKey],
  );

  // 화면 갱신 폴링 대상 — running 세션 전부(활성 세션은 항상 표에 있으므로 곧 보이는 행).
  // 틱 발화는 서버 스케줄러 전담. 세션 수명은 일시정지/완료로 관리.
  const runningSessionIds = useMemo(
    () =>
      cliSessions
        .filter(
          (session) =>
            session.status === "running" && isSessionStartedOnKstDate(session, todayKey),
        )
        .map((session) => session.id),
    [cliSessions, todayKey],
  );

  const pastSessions = useMemo(
    () =>
      filterPastSessions(cliSessions, todayKey).sort((a, b) =>
        b.startedAt.localeCompare(a.startedAt),
      ),
    [cliSessions, todayKey],
  );

  const start = (
    stock: PaperTradingSelectedStock,
    initialCash: number,
    tickIntervalMinutes: number,
    positionHardStopPct: number | null,
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
      // 손절 상한(포지션 하드스톱) — 표 셀렉트 선택값. null=끄기(동적 손절선은 유지).
      positionHardStopPct,
    });

  return {
    sessionByTicker,
    todaySessionStocks,
    pastSessions,
    runningSessionIds,
    /** 이 서버 운영자 — 표 소유자 배지·"내 세션만" 필터 판정용(구 응답이면 undefined). */
    currentOperator,
    isCreating,
    start,
  };
}
