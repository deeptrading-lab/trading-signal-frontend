/**
 * 단타 폴링 주기 순수 함수 — intraday-live-refresh.
 *
 * ★ 핵심 회귀 방지: 목록 폴링은 **어떤 입력에도 멈추지 않는다**. "실행 중 세션이 없으니 끄자" 가
 *   구 `useIntradayPaperRefresh` 교착(새 세션을 영영 발견 못 함)의 정확한 재발 경로다.
 */
import { describe, expect, it } from "vitest";
import {
  paperSessionRefetchInterval,
  paperSessionsRefetchInterval,
} from "@/lib/query/paperTradingPolling";
import { queryConfig } from "@/lib/query/queryConfig";
import type { PaperTradingSession } from "@/lib/types/paperTrading/paperTrading";

// 2026-07-06 = 월요일. 05:00Z = 14:00 KST(장중), 12:00Z = 21:00 KST(마감).
// 2026-07-04 = 토요일.
const marketNow = new Date("2026-07-06T05:00:00.000Z");
const afterCloseNow = new Date("2026-07-06T06:45:00.000Z"); // 15:45 KST
const weekendNow = new Date("2026-07-04T05:00:00.000Z");

function detail(status: PaperTradingSession["status"]) {
  return { session: { status } as PaperTradingSession };
}

describe("paperSessionsRefetchInterval", () => {
  it("장중이면 짧은 주기", () => {
    expect(paperSessionsRefetchInterval(marketNow)).toBe(
      queryConfig.paperTrading.sessionsPollMs,
    );
  });

  it("장 마감 후·주말이면 느린 주기로 낮추되 멈추지는 않는다", () => {
    expect(paperSessionsRefetchInterval(afterCloseNow)).toBe(
      queryConfig.paperTrading.sessionsIdlePollMs,
    );
    expect(paperSessionsRefetchInterval(weekendNow)).toBe(
      queryConfig.paperTrading.sessionsIdlePollMs,
    );
  });

  it("★ 어떤 시각에도 false(정지)를 반환하지 않는다 — 목록 폴링 교착 재발 방지", () => {
    for (const now of [marketNow, afterCloseNow, weekendNow]) {
      const interval = paperSessionsRefetchInterval(now);
      expect(typeof interval).toBe("number");
      expect(interval).toBeGreaterThan(0);
    }
  });
});

describe("paperSessionRefetchInterval", () => {
  it("데이터 없으면 정지", () => {
    expect(paperSessionRefetchInterval(undefined, marketNow)).toBe(false);
  });

  it("종료 세션(completed·failed)은 장중이어도 영구 정지", () => {
    expect(paperSessionRefetchInterval(detail("completed"), marketNow)).toBe(false);
    expect(paperSessionRefetchInterval(detail("failed"), marketNow)).toBe(false);
  });

  it("장중 running 은 폴링", () => {
    expect(paperSessionRefetchInterval(detail("running"), marketNow)).toBe(
      queryConfig.paperTrading.sessionPollMs,
    );
  });

  it("일시정지도 장중이면 계속 폴링한다 — 다른 탭/서버에서 재개했을 때 복구되어야 한다", () => {
    expect(paperSessionRefetchInterval(detail("paused"), marketNow)).toBe(
      queryConfig.paperTrading.sessionPollMs,
    );
  });

  it("장외·주말이면 running 이어도 정지(서버 스케줄러도 안 돈다)", () => {
    expect(paperSessionRefetchInterval(detail("running"), afterCloseNow)).toBe(false);
    expect(paperSessionRefetchInterval(detail("running"), weekendNow)).toBe(false);
  });
});
