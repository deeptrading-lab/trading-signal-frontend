/**
 * `lib/api/kis/token.ts` 단위 테스트.
 *
 * PRD `stock-api-integration` AC-6 — 다음 4개 케이스 검증:
 *   1. 첫 호출 → fetcher 1회.
 *   2. 두 번째 호출 (TTL 내) → fetcher 0회 (캐시 hit).
 *   3. 만료 60s 전 → 갱신 (fetcher 1회).
 *   4. 동시 호출 5건 → single-flight, fetcher 1회.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getAccessToken,
  resetTokenCacheForTest,
  type TokenFetcher,
} from "../token";
import type { KisTokenResponse } from "../types";

const APP_KEY = "test-app-key";
const APP_SECRET = "test-app-secret";

/**
 * fetcher mock — 호출 수 + 응답 토큰 정의 가능.
 */
function makeMockFetcher(
  responses: KisTokenResponse[],
): { fetcher: TokenFetcher; callCount: () => number } {
  let calls = 0;
  let cursor = 0;
  const fetcher: TokenFetcher = async () => {
    calls += 1;
    const response = responses[Math.min(cursor, responses.length - 1)];
    cursor += 1;
    return response;
  };
  return { fetcher, callCount: () => calls };
}

describe("getAccessToken", () => {
  beforeEach(() => {
    resetTokenCacheForTest();
  });

  it("[#1] 첫 호출 시 fetcher 를 1회 호출하고 access_token 을 반환한다", async () => {
    const { fetcher, callCount } = makeMockFetcher([
      { access_token: "token-v1", expires_in: 86_400 },
    ]);

    const token = await getAccessToken({
      fetcher,
      now: () => 1_000_000,
      appKey: APP_KEY,
      appSecret: APP_SECRET,
      env: "vts",
    });

    expect(token).toBe("token-v1");
    expect(callCount()).toBe(1);
  });

  it("[#2] 두 번째 호출은 캐시 hit — fetcher 호출 0회", async () => {
    const { fetcher, callCount } = makeMockFetcher([
      { access_token: "token-v1", expires_in: 86_400 },
    ]);

    const first = await getAccessToken({
      fetcher,
      now: () => 1_000_000,
      appKey: APP_KEY,
      appSecret: APP_SECRET,
      env: "vts",
    });

    const second = await getAccessToken({
      fetcher,
      // 1초 뒤. 캐시 TTL (86400s) 안.
      now: () => 1_001_000,
      appKey: APP_KEY,
      appSecret: APP_SECRET,
      env: "vts",
    });

    expect(first).toBe("token-v1");
    expect(second).toBe("token-v1");
    expect(callCount()).toBe(1); // 두 번째는 캐시.
  });

  it("[#3] 만료 60s 전부터 자동 갱신 (fetcher 1회 추가)", async () => {
    const { fetcher, callCount } = makeMockFetcher([
      { access_token: "token-v1", expires_in: 100 }, // 100s 만료.
      { access_token: "token-v2", expires_in: 100 },
    ]);

    // T=0 → 발급 (만료 = 100_000 ms). 갱신 임계 = 만료 - 60s = 40_000 ms.
    const first = await getAccessToken({
      fetcher,
      now: () => 0,
      appKey: APP_KEY,
      appSecret: APP_SECRET,
      env: "vts",
    });
    expect(first).toBe("token-v1");

    // T=30_000 (만료 70s 전) — grace period (60s) 바깥 — 캐시 hit.
    const cached = await getAccessToken({
      fetcher,
      now: () => 30_000,
      appKey: APP_KEY,
      appSecret: APP_SECRET,
      env: "vts",
    });
    expect(cached).toBe("token-v1");
    expect(callCount()).toBe(1);

    // T=41_000 (만료 59s 전) — grace period 안 — 갱신 트리거.
    const refreshed = await getAccessToken({
      fetcher,
      now: () => 41_000,
      appKey: APP_KEY,
      appSecret: APP_SECRET,
      env: "vts",
    });
    expect(refreshed).toBe("token-v2");
    expect(callCount()).toBe(2);
  });

  it("[#4] 동시 호출 5건 — single-flight 로 fetcher 1회만 호출", async () => {
    let calls = 0;
    type ResolveFn = (value: KisTokenResponse) => void;
    const resolvers: { current: ResolveFn | null } = { current: null };
    const fetcher: TokenFetcher = () => {
      calls += 1;
      return new Promise<KisTokenResponse>((resolve) => {
        resolvers.current = resolve;
      });
    };

    // 동시 5건 발사 — 모두 inflight Promise 를 await.
    const promises = Array.from({ length: 5 }, () =>
      getAccessToken({
        fetcher,
        now: () => 0,
        appKey: APP_KEY,
        appSecret: APP_SECRET,
        env: "vts",
      }),
    );

    // 10ms 정도 대기 — 모든 5건이 동일 Promise 를 기다리고 있어야 함.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(calls).toBe(1);

    // 응답 발사.
    if (resolvers.current) {
      resolvers.current({
        access_token: "token-single-flight",
        expires_in: 86_400,
      });
    }

    const tokens = await Promise.all(promises);
    expect(tokens.every((t) => t === "token-single-flight")).toBe(true);
    expect(calls).toBe(1);
  });

  it("[#5] env 가 다르면 캐시 키도 분리 — 모의 / 실전 cross-contamination 차단", async () => {
    const { fetcher, callCount } = makeMockFetcher([
      { access_token: "token-vts", expires_in: 86_400 },
      { access_token: "token-prod", expires_in: 86_400 },
    ]);

    const vts = await getAccessToken({
      fetcher,
      now: () => 0,
      appKey: APP_KEY,
      appSecret: APP_SECRET,
      env: "vts",
    });
    const prod = await getAccessToken({
      fetcher,
      now: () => 0,
      appKey: APP_KEY,
      appSecret: APP_SECRET,
      env: "prod",
    });

    expect(vts).toBe("token-vts");
    expect(prod).toBe("token-prod");
    expect(callCount()).toBe(2);
  });

  it("[#6] 환경변수 (appKey/appSecret) 미설정 시 한글 에러 throw", async () => {
    await expect(
      getAccessToken({
        fetcher: async () => ({ access_token: "should-not-reach" }),
        now: () => 0,
        appKey: "",
        appSecret: "",
        env: "vts",
      }),
    ).rejects.toMatchObject({
      kind: "server",
      message: expect.stringContaining("KIS_APP_KEY"),
    });
  });

  it("[#7] fetcher 가 error_code 응답 시 한글 에러 통과", async () => {
    const fetcher: TokenFetcher = async () => ({
      access_token: "",
      error_code: "EGW00123",
      error_description: "유효하지 않은 자격증명입니다.",
    });

    await expect(
      getAccessToken({
        fetcher,
        now: () => 0,
        appKey: APP_KEY,
        appSecret: APP_SECRET,
        env: "vts",
      }),
    ).rejects.toMatchObject({
      kind: "server",
      message: "유효하지 않은 자격증명입니다.",
    });
  });
});
