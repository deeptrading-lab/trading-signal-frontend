/**
 * `lib/api/kis/tossEnrich.ts` 단위 테스트 — 토스 모드 KIS 메타 보강 로더.
 *
 * 설계 제약 회귀 차단:
 *   1. best-effort — fetcher throw 는 null 로 흡수(절대 throw 하지 않음)
 *   2. 예산 캡 — 느린 KIS 가 호출을 budgetMs 이상 붙잡지 못함(백그라운드 로드는 지속)
 *   3. 실패 캐시 — 장애 중 매 호출 재시도 방지
 *   4. 국내 6자리 전용 가드 + single-flight
 */

import { describe, it, expect, vi } from "vitest";
import { createKisMetaLoader } from "../tossEnrich";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("createKisMetaLoader", () => {
  it("성공 시 캐시 — TTL 내 재호출은 fetcher 를 다시 부르지 않는다", async () => {
    const fetcher = vi.fn().mockResolvedValue({ sector: "전기·전자" });
    const load = createKisMetaLoader({ ttlMs: 1_000, failureTtlMs: 100, budgetMs: 500, fetcher });

    await expect(load("005930")).resolves.toEqual({ sector: "전기·전자" });
    await expect(load("005930")).resolves.toEqual({ sector: "전기·전자" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("fetcher throw → null (throw 전파 없음) + 실패 캐시로 재시도 억제", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("KIS 500"));
    const load = createKisMetaLoader({ ttlMs: 1_000, failureTtlMs: 1_000, budgetMs: 500, fetcher });

    await expect(load("005930")).resolves.toBeNull();
    await expect(load("005930")).resolves.toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1); // 실패 캐시 히트
  });

  it("실패 캐시 만료 후에는 재시도한다", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("일시 장애"))
      .mockResolvedValueOnce({ foreignRatio: 51.2 });
    const load = createKisMetaLoader({ ttlMs: 1_000, failureTtlMs: 20, budgetMs: 500, fetcher });

    await expect(load("005930")).resolves.toBeNull();
    await wait(30); // failureTtl 경과
    await expect(load("005930")).resolves.toEqual({ foreignRatio: 51.2 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("예산 초과 시 이번 호출은 null, 로드는 백그라운드 지속 → 다음 호출이 캐시 히트", async () => {
    const fetcher = vi.fn(async () => {
      await wait(80);
      return { sector: "느린 KIS" };
    });
    const load = createKisMetaLoader({ ttlMs: 1_000, failureTtlMs: 100, budgetMs: 15, fetcher });

    await expect(load("005930")).resolves.toBeNull(); // 15ms 예산 < 80ms 로드
    await wait(100); // 백그라운드 로드 완료 대기
    await expect(load("005930")).resolves.toEqual({ sector: "느린 KIS" });
    expect(fetcher).toHaveBeenCalledTimes(1); // 재로드 아닌 캐시
  });

  it("국내 6자리가 아니면 시도 없이 null (미국 티커 등)", async () => {
    const fetcher = vi.fn();
    const load = createKisMetaLoader({ ttlMs: 1_000, failureTtlMs: 100, budgetMs: 500, fetcher });

    await expect(load("AAPL")).resolves.toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("동시 호출은 single-flight — fetcher 1회", async () => {
    const fetcher = vi.fn(async () => {
      await wait(20);
      return { sector: "동시" };
    });
    const load = createKisMetaLoader({ ttlMs: 1_000, failureTtlMs: 100, budgetMs: 500, fetcher });

    const [a, b] = await Promise.all([load("005930"), load("005930")]);
    expect(a).toEqual({ sector: "동시" });
    expect(b).toEqual({ sector: "동시" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
