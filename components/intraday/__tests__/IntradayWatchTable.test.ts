/**
 * `groupWatchItemsByDate` 단위 테스트 — 표 렌더와 워크스페이스의 "펼친 과거 그룹 시세 지연로드"
 * 계산이 같은 그룹핑을 공유하므로(순수 함수), 날짜 그룹 경계·정렬·세션 없는 행 폴백을 고정한다.
 */
import { describe, expect, it } from "vitest";
import { groupWatchItemsByDate } from "@/components/intraday/IntradayWatchTable";
import type { PaperTradingSession } from "@/lib/types/paperTrading/paperTrading";

function session(id: string, startedAt: string): PaperTradingSession {
  return {
    id,
    name: "단타 모의",
    status: "completed",
    tickers: ["005930"],
    stocks: [{ ticker: "005930", name: "삼성전자", market: "KOSPI" }],
    initialCash: 1_000_000,
    targetReturnPct: 5,
    cash: 1_000_000,
    portfolioValue: 1_000_000,
    returnPct: 0,
    riskMode: "balanced",
    maxPositionPct: 50,
    cashBufferPct: 10,
    tickIntervalMinutes: 5,
    decisionProvider: "cli-agent",
    aiProvider: "codex",
    mode: "live-paper",
    lastTickWindowStart: null,
    startedAt,
    endedAt: null,
    createdAt: startedAt,
    updatedAt: startedAt,
  };
}

describe("groupWatchItemsByDate", () => {
  const todayKey = "2026-07-09";

  it("세션 시작일(KST) 기준으로 그룹핑하고 최신 날짜를 먼저 정렬한다", () => {
    const sessionByTicker = new Map<string, PaperTradingSession>([
      // 00:30Z ≈ 09:30 KST → 07-08 그룹
      ["005930", session("a", "2026-07-08T00:30:00.000Z")],
      ["000660", session("b", "2026-07-07T00:30:00.000Z")],
    ]);
    const items = [
      { ticker: "000660", name: "SK하이닉스" },
      { ticker: "005930", name: "삼성전자" },
    ];

    const groups = groupWatchItemsByDate(items, sessionByTicker, todayKey);

    expect(groups.map((g) => g.dateKey)).toEqual(["2026-07-08", "2026-07-07"]);
    expect(groups[0].items.map((i) => i.ticker)).toEqual(["005930"]);
    expect(groups[1].items.map((i) => i.ticker)).toEqual(["000660"]);
  });

  it("세션이 없는 워치 행(검색 추가)은 오늘 그룹으로 떨어진다", () => {
    const groups = groupWatchItemsByDate(
      [{ ticker: "035720", name: "카카오" }],
      new Map(),
      todayKey,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].dateKey).toBe(todayKey);
    expect(groups[0].items.map((i) => i.ticker)).toEqual(["035720"]);
  });

  it("KST 자정 경계(전날 15:00Z = 당일 00:00 KST) 를 넘겨 그룹이 갈린다", () => {
    const sessionByTicker = new Map<string, PaperTradingSession>([
      // 07-08T15:00Z = 07-09T00:00 KST → 오늘 그룹
      ["005930", session("a", "2026-07-08T15:00:00.000Z")],
      // 07-08T14:59Z = 07-08T23:59 KST → 어제 그룹
      ["000660", session("b", "2026-07-08T14:59:00.000Z")],
    ]);
    const groups = groupWatchItemsByDate(
      [
        { ticker: "005930", name: "삼성전자" },
        { ticker: "000660", name: "SK하이닉스" },
      ],
      sessionByTicker,
      todayKey,
    );
    expect(groups.map((g) => g.dateKey)).toEqual(["2026-07-09", "2026-07-08"]);
  });
});
