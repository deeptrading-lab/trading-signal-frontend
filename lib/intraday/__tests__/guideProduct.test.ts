import { describe, expect, it } from "vitest";
import {
  buildIntradayGuideScenario,
  intradayGuideValidUntil,
  isFreshGuideRiskAcknowledgement,
  resolveIntradayGuideWaitReason,
} from "@/lib/intraday/guideProduct";
import type { AutopilotRun } from "@/lib/types/paperTrading/autopilot";

function run(over: Partial<AutopilotRun> = {}): AutopilotRun {
  return {
    id: "run-1",
    status: "active",
    purpose: "guide",
    owner: "me",
    totalCapital: 10_000_000,
    slotCount: 3,
    perSlotCash: 3_333_333,
    riskMode: "balanced",
    slots: [],
    cooldownUntilByTicker: {},
    rotationLog: [],
    lastSweepWindowStart: null,
    startedAt: "2026-07-13T01:00:00.000Z",
    endedAt: null,
    createdAt: "2026-07-13T01:00:00.000Z",
    updatedAt: "2026-07-13T01:00:00.000Z",
    ...over,
  };
}

describe("AI 단타 가이드 상품 계산", () => {
  it("1천만 원·최대 50% 투입·+2%/-1%를 금액으로 환산한다", () => {
    expect(buildIntradayGuideScenario(10_000_000)).toEqual({
      deployedCapital: 5_000_000,
      targetProfit: 100_000,
      plannedLoss: 50_000,
    });
  });

  it("가이드 유효 종료시각을 분 단위로 계산한다", () => {
    expect(intradayGuideValidUntil("2026-07-13T01:00:00.000Z", 10)).toBe(
      "2026-07-13T01:10:00.000Z",
    );
  });

  it("위험 확인 시각은 10분 이내의 현재·과거 값만 허용한다", () => {
    const current = new Date("2026-07-13T01:10:00.000Z");
    expect(isFreshGuideRiskAcknowledgement("2026-07-13T01:00:00.000Z", current)).toBe(true);
    expect(isFreshGuideRiskAcknowledgement("2026-07-13T00:59:59.999Z", current)).toBe(false);
    expect(isFreshGuideRiskAcknowledgement("2026-07-13T01:12:00.000Z", current)).toBe(false);
    expect(isFreshGuideRiskAcknowledgement(undefined, current)).toBe(false);
  });
});

describe("후보 대기 이유", () => {
  it("KIS가 준비되지 않으면 시장 데이터 대기를 최우선한다", () => {
    expect(resolveIntradayGuideWaitReason(run(), false)).toBe("market-data");
  });

  it("최근 skip 로그의 쿨다운·중복 사유를 고객 상태로 변환한다", () => {
    expect(resolveIntradayGuideWaitReason(run({
      rotationLog: [{ at: "2026-07-13T01:05:00.000Z", kind: "skip", slotIndex: null, note: "가용 후보 없음(쿨다운·중복 제외)" }],
    }), true)).toBe("cooldown");
  });

  it("1차 통과 후보가 있으면 품질 게이트 확인 중으로 설명한다", () => {
    expect(resolveIntradayGuideWaitReason(run({
      lastScreenerSummary: {
        at: "2026-07-13T01:05:00.000Z",
        universeSize: 80,
        passed: 12,
        top: [],
      },
    }), true)).toBe("quality-gate");
  });

  it("과거 skip 뒤 최신 fill이 있으면 오래된 대기 사유를 재사용하지 않는다", () => {
    expect(resolveIntradayGuideWaitReason(run({
      rotationLog: [
        { at: "2026-07-13T01:00:00.000Z", kind: "skip", slotIndex: null, note: "가용 후보 없음(쿨다운·중복 제외)" },
        { at: "2026-07-13T01:10:00.000Z", kind: "fill", slotIndex: 0, incoming: { sessionId: "s1", ticker: "005930", score: 0.7 } },
      ],
    }), true)).toBe("screening");
  });
});
