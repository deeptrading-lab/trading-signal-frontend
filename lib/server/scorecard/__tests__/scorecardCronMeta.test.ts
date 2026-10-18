/**
 * readScorecardCronMeta — store 는 장애·타임아웃도 null 로 삼키므로, 그 경우만 throw 해
 * 호출부가 "실행 기록 없음(미달)" 대신 "확인 불가"로 표시하게 한다(PR #395 QA).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const store = { get: vi.fn(), set: vi.fn(), wasLastCallDegraded: vi.fn() };
vi.mock("@/lib/api/kis/store", () => ({ getKisStore: () => store }));

import { readScorecardCronMeta } from "@/lib/server/scorecard/scorecardCronMeta";

describe("readScorecardCronMeta", () => {
  beforeEach(() => {
    store.get.mockReset();
    store.wasLastCallDegraded.mockReset().mockReturnValue(false);
  });

  it("마커가 있으면 그대로", async () => {
    store.get.mockResolvedValue({ at: "2026-10-18T08:05:52Z", ok: true, env: "prod" });
    await expect(readScorecardCronMeta()).resolves.toMatchObject({ ok: true });
  });

  it("정상 store 에서 마커가 없으면 null(미달 사유 = 실행 기록 없음)", async () => {
    store.get.mockResolvedValue(null);
    await expect(readScorecardCronMeta()).resolves.toBeNull();
  });

  it("store 장애로 null 이면 throw(확인 불가)", async () => {
    store.get.mockResolvedValue(null);
    store.wasLastCallDegraded.mockReturnValue(true);
    await expect(readScorecardCronMeta()).rejects.toThrow("degraded");
  });
});
