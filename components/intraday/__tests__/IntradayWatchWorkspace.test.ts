import { describe, expect, it } from "vitest";
import {
  buildPastSessionRows,
  collectTickersForDateKeys,
  intradayWatchStorageKey,
  isForeignOwnedSession,
  toggleWatchItem,
  type Watch,
} from "@/components/intraday/IntradayWatchWorkspace";
import type { WatchDateGroup } from "@/components/intraday/IntradayWatchTable";
import type { PaperTradingSession } from "@/lib/types/paperTrading/paperTrading";

function session(overrides: Partial<PaperTradingSession>): PaperTradingSession {
  return {
    id: "s1",
    name: "단타 모의",
    status: "completed",
    tickers: ["005930"],
    stocks: [{ ticker: "005930", name: "삼성전자", market: "KOSPI" }],
    initialCash: 1_000_000,
    targetReturnPct: 5,
    cash: 1_000_000,
    portfolioValue: 1_010_000,
    returnPct: 1,
    riskMode: "balanced",
    maxPositionPct: 50,
    cashBufferPct: 10,
    tickIntervalMinutes: 5,
    decisionProvider: "cli-agent",
    aiProvider: "codex",
    mode: "live-paper",
    lastTickWindowStart: null,
    startedAt: "2026-07-07T01:00:00.000Z",
    endedAt: "2026-07-07T06:40:00.000Z",
    createdAt: "2026-07-07T01:00:00.000Z",
    updatedAt: "2026-07-07T06:40:00.000Z",
    ...overrides,
  };
}

describe("IntradayWatchWorkspace helpers", () => {
  it("워치 localStorage 키를 KST 날짜별로 분리한다", () => {
    expect(intradayWatchStorageKey("2026-07-07")).toBe(
      "finsight:intraday-watch:2026-07-07",
    );
    expect(intradayWatchStorageKey("2026-07-09")).toBe(
      "finsight:intraday-watch:2026-07-09",
    );
  });

  it("추천 종목 칩은 같은 종목을 클릭할 때 추가와 제거를 토글한다", () => {
    const samsung: Watch = { ticker: "005930", name: "삼성전자" };
    const hynix: Watch = { ticker: "000660", name: "SK하이닉스" };

    const added = toggleWatchItem([samsung], hynix);
    expect(added.map((item) => item.ticker)).toEqual(["005930", "000660"]);

    const removed = toggleWatchItem(added, samsung);
    expect(removed.map((item) => item.ticker)).toEqual(["000660"]);
  });

  it("과거 세션 1건 = 1행 — 같은 종목의 다른 날짜 세션이 삼켜지지 않는다", () => {
    const first = session({ id: "old-1" });
    // 같은 종목(005930)의 하루 전 세션 — 예전에는 ticker 중복으로 통째 사라졌다.
    const sameTickerOlderDay = session({
      id: "old-0",
      startedAt: "2026-07-06T01:00:00.000Z",
    });
    const second = session({
      id: "old-2",
      tickers: ["000660"],
      stocks: [{ ticker: "000660", name: "SK하이닉스", market: "KOSPI" }],
    });

    const view = buildPastSessionRows([first, sameTickerOlderDay, second]);

    expect(view.rows.map((item) => item.ticker)).toEqual(["005930", "005930", "000660"]);
    // 행 식별자는 세션 id — 같은 종목 두 행이 서로 다른 세션을 가리킨다.
    expect(view.rows.map((item) => item.rowKey)).toEqual(["old-1", "old-0", "old-2"]);
    expect(view.sessionByRowKey.get("old-1")?.id).toBe("old-1");
    expect(view.sessionByRowKey.get("old-0")?.id).toBe("old-0");
    expect(view.sessionByRowKey.get("old-2")?.id).toBe("old-2");
  });

  it("같은 날 같은 종목 세션이 둘이어도 둘 다 남긴다(합산 손익 누락 방지)", () => {
    const morning = session({ id: "same-day-1" });
    const afternoon = session({ id: "same-day-2" });

    const view = buildPastSessionRows([morning, afternoon]);

    expect(view.rows).toHaveLength(2);
    expect(view.sessionByRowKey.size).toBe(2);
  });
});

describe("collectTickersForDateKeys", () => {
  const groups: WatchDateGroup[] = [
    {
      dateKey: "2026-07-08",
      items: [
        { ticker: "005930", name: "삼성전자" },
        { ticker: "000660", name: "SK하이닉스" },
      ],
    },
    {
      dateKey: "2026-07-07",
      items: [
        { ticker: "000660", name: "SK하이닉스" },
        { ticker: "402340", name: "SK스퀘어" },
      ],
    },
  ];

  it("펼친 날짜 그룹의 티커만 모은다(접힌 그룹 제외)", () => {
    const result = collectTickersForDateKeys(groups, new Set(["2026-07-08"]));
    expect(result).toEqual(["005930", "000660"]);
  });

  it("여러 그룹이 펼쳐지면 그룹 순서를 보존하고 티커 중복은 제거한다", () => {
    const result = collectTickersForDateKeys(
      groups,
      new Set(["2026-07-08", "2026-07-07"]),
    );
    // 000660 은 두 그룹에 모두 있지만 한 번만(첫 등장 순서).
    expect(result).toEqual(["005930", "000660", "402340"]);
  });

  it("펼친 그룹이 없으면 빈 배열(지연로드 요청 0)", () => {
    expect(collectTickersForDateKeys(groups, new Set())).toEqual([]);
  });
});

describe("isForeignOwnedSession (\"내 세션만\" 필터 판정)", () => {
  const me = "my-op";

  it("다른 운영자 소유 세션은 숨김 대상(true)", () => {
    expect(isForeignOwnedSession(session({ owner: "friend-op" }), me)).toBe(true);
  });

  it("내 소유 세션은 유지(false)", () => {
    expect(isForeignOwnedSession(session({ owner: me }), me)).toBe(false);
  });

  it("소유자 미지정(레거시) 세션은 귀속 불가라 유지(false)", () => {
    expect(isForeignOwnedSession(session({ owner: undefined }), me)).toBe(false);
  });

  it("세션 없는 워치 행은 유지(false)", () => {
    expect(isForeignOwnedSession(undefined, me)).toBe(false);
  });

  it("currentOperator 미상(구 응답/미로드)이면 아무것도 숨기지 않음(false)", () => {
    expect(isForeignOwnedSession(session({ owner: "friend-op" }), undefined)).toBe(false);
  });
});
