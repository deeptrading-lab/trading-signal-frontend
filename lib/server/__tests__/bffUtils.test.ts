/**
 * fetchWithTransientRetryOrThrow 단위 테스트 — 조회 실패를 폴백으로 흡수하지 않고 throw 로
 * 전파하는지 검증. 채점 cron 의 "일시 장애 → pending 재시도(영구 skip 아님)" 보장의 근거
 * (signal-scorecard 리뷰 주요 1건 하드닝).
 */

import { describe, it, expect } from "vitest";
import { fetchWithTransientRetryOrThrow } from "@/lib/server/bffUtils";
import { makeApiError } from "@/lib/api/errors";

describe("fetchWithTransientRetryOrThrow", () => {
  it("성공 시 값을 반환하고 fn 을 1회만 호출", async () => {
    let calls = 0;
    const r = await fetchWithTransientRetryOrThrow(async () => {
      calls += 1;
      return [1, 2, 3];
    }, 0);
    expect(r).toEqual([1, 2, 3]);
    expect(calls).toBe(1);
  });

  it("비-transient 실패는 재시도 없이 즉시 throw(폴백 흡수 안 함)", async () => {
    let calls = 0;
    await expect(
      fetchWithTransientRetryOrThrow(async () => {
        calls += 1;
        throw new Error("boom");
      }, 0),
    ).rejects.toThrow("boom");
    expect(calls).toBe(1); // 재시도 없음
  });

  it("transient(네트워크) 실패는 1회 재시도 후에도 실패하면 throw(fn 2회 호출)", async () => {
    let calls = 0;
    await expect(
      fetchWithTransientRetryOrThrow(async () => {
        calls += 1;
        throw makeApiError("network", { message: "네트워크 단절" });
      }, 0),
    ).rejects.toMatchObject({ kind: "network" });
    expect(calls).toBe(2); // 최초 + backoff 후 1회 재시도
  });

  it("transient 실패 후 재시도 성공 시 값 반환(fn 2회 호출)", async () => {
    let calls = 0;
    const r = await fetchWithTransientRetryOrThrow(async () => {
      calls += 1;
      if (calls === 1) throw makeApiError("network", { message: "일시 단절" });
      return "ok";
    }, 0);
    expect(r).toBe("ok");
    expect(calls).toBe(2);
  });
});
