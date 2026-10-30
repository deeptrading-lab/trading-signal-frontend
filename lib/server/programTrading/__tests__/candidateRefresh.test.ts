import { describe, expect, it, vi } from "vitest";
import { createCandidateRefresh } from "../candidateRefresh";
import { emptyCandidateSnapshot } from "@/lib/validation/programTrading/candidateGate";

describe("후보 갱신 분리", () => {
  it("조회 중 매매 대기열을 점유하지 않고 중복 요청을 합친다", async () => {
    const snapshot = emptyCandidateSnapshot();
    let resolve!: (value: typeof snapshot) => void;
    const load = vi.fn(() => new Promise<typeof snapshot>(done => { resolve = done; }));
    const apply = vi.fn(async () => {});
    const refresh = createCandidateRefresh(load, apply);
    const first = refresh();
    expect(refresh()).toBe(first);
    await Promise.resolve();
    expect(load).toHaveBeenCalledTimes(1);
    expect(apply).not.toHaveBeenCalled();
    resolve(snapshot);
    await first;
    expect(apply).toHaveBeenCalledWith(snapshot);
  });
  it("조회 실패 후 다음 갱신을 재시도한다", async () => {
    const snapshot = emptyCandidateSnapshot();
    const load = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(snapshot);
    const apply = vi.fn(async () => {});
    const refresh = createCandidateRefresh(load, apply);
    await expect(refresh()).rejects.toThrow("offline");
    await refresh();
    expect(load).toHaveBeenCalledTimes(2);
    expect(apply).toHaveBeenCalledTimes(1);
  });
});
