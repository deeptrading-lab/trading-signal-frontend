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
import { MemoryKisStore, setKisStoreForTest, type KisStore } from "../store";
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
    // L2 store 도 매 테스트 격리 — 기본 memory store(인스턴스 내 Map)를 새로 주입.
    // memory 모드는 L1·inflight 만으로 현행과 동일 동작(무회귀, kis-token-store §3.1).
    setKisStoreForTest(new MemoryKisStore());
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

/**
 * kv 모드 — 인스턴스 간 공유 store + 분산 single-flight(SET NX PX).
 *
 * 실제 Upstash 라이브 검증은 프로비저닝(사용자 작업) 후라 불가 → **fake store 주입**으로 커버.
 * 인스턴스 경계는 매 호출 전 `resetTokenCacheForTest()`(L1·inflight 비움)로 흉내 — 각 호출이
 * 새 인스턴스처럼 store/락 경로를 독립적으로 탄다. store(KisStore)는 인스턴스 간 공유 그대로 유지.
 */
describe("getAccessToken — kv 모드(분산 single-flight, fake store)", () => {
  /** 호출 추적이 가능한 fake KisStore — 락은 1회만 성공(NX). */
  function makeFakeStore(): KisStore & {
    entries: Map<string, CacheEntryLike>;
    getCalls: () => number;
    setCalls: () => Array<{ key: string; ttlSec: number }>;
    acquireCalls: () => number;
  } {
    const entries = new Map<string, CacheEntryLike>();
    const locks = new Set<string>();
    let getCalls = 0;
    let acquireCalls = 0;
    const setCalls: Array<{ key: string; ttlSec: number }> = [];
    return {
      entries,
      getCalls: () => getCalls,
      setCalls: () => setCalls,
      acquireCalls: () => acquireCalls,
      async get<T>(key: string): Promise<T | null> {
        getCalls += 1;
        return (entries.get(key) as T | undefined) ?? null;
      },
      async set<T>(key: string, value: T, ttlSec: number): Promise<void> {
        setCalls.push({ key, ttlSec });
        entries.set(key, value as unknown as CacheEntryLike);
      },
      async del(key: string): Promise<void> {
        entries.delete(key);
      },
      async acquireLock(key: string): Promise<string | null> {
        acquireCalls += 1;
        if (locks.has(key)) return null; // 이미 잠김 → 미획득.
        locks.add(key);
        return `lock-${acquireCalls}`;
      },
      async releaseLock(key: string): Promise<void> {
        locks.delete(key);
      },
    };
  }
  type CacheEntryLike = { token: string; expiresAt: number };

  beforeEach(() => {
    resetTokenCacheForTest();
  });

  it("[kv] 첫 인스턴스 발급 → store SET, 둘째 인스턴스 store hit 시 fetcher 0회", async () => {
    const store = makeFakeStore();
    const { fetcher, callCount } = makeMockFetcher([
      { access_token: "issued", expires_in: 86_400 },
    ]);
    const token = await getAccessToken({
      fetcher,
      now: () => 0,
      appKey: APP_KEY,
      appSecret: APP_SECRET,
      env: "prod",
      store,
    });
    // store SET 으로 발급분이 기록됨(키는 해시).
    expect(token).toBe("issued");
    expect(callCount()).toBe(1);
    expect(store.setCalls().length).toBe(1);
    expect(store.setCalls()[0].key).toMatch(/^kis:token:prod:[0-9a-f]{16}$/);

    // 두 번째 인스턴스(L1 비움) → store hit → fetcher 추가 0회.
    resetTokenCacheForTest();
    const second = await getAccessToken({
      fetcher,
      now: () => 0,
      appKey: APP_KEY,
      appSecret: APP_SECRET,
      env: "prod",
      store,
    });
    expect(second).toBe("issued");
    expect(callCount()).toBe(1); // store hit — 추가 발급 0.
  });

  it("[kv][AC-3] 락 잡은 인스턴스만 발급, 미획득 인스턴스는 폴링으로 store 수렴", async () => {
    const store = makeFakeStore();
    let issued = 0;
    // 발급은 느리게(락 보유 인스턴스가 store 에 쓸 때까지 폴링 인스턴스가 대기).
    const slowFetcher: TokenFetcher = async () => {
      issued += 1;
      await new Promise((r) => setTimeout(r, 80));
      return { access_token: "locked-token", expires_in: 86_400 };
    };

    // 인스턴스 A — 락 획득 후 발급.
    const a = getAccessToken({
      fetcher: slowFetcher,
      now: () => 0,
      appKey: APP_KEY,
      appSecret: APP_SECRET,
      env: "prod",
      store,
    });
    // 인스턴스 B — L1 비워 새 인스턴스로 만들고 즉시 발사(락 미획득 → 폴링).
    resetTokenCacheForTest();
    const b = getAccessToken({
      fetcher: slowFetcher,
      now: () => 0,
      appKey: APP_KEY,
      appSecret: APP_SECRET,
      env: "prod",
      store,
    });

    const [ta, tb] = await Promise.all([a, b]);
    expect(ta).toBe("locked-token");
    expect(tb).toBe("locked-token");
    // 락은 A 만 획득 → 발급 1회. B 는 폴링으로 store 에서 같은 토큰 수신.
    expect(issued).toBe(1);
  });

  it("[kv][AC-3] 락 미획득 + 폴링 만료 + store 비면 → 직접 발급 fallback", async () => {
    // 락이 항상 미획득(다른 인스턴스가 잡았지만 store 를 끝내 못 채운 상황)인 store.
    const stuckStore: KisStore = {
      async get<T>(): Promise<T | null> {
        return null; // 폴링 내내 store 비어 있음.
      },
      async set(): Promise<void> {},
      async del(): Promise<void> {},
      async acquireLock(): Promise<string | null> {
        return null; // 항상 미획득.
      },
      async releaseLock(): Promise<void> {},
    };
    const { fetcher, callCount } = makeMockFetcher([
      { access_token: "fallback-token", expires_in: 86_400 },
    ]);

    const token = await getAccessToken({
      fetcher,
      now: () => 0,
      appKey: APP_KEY,
      appSecret: APP_SECRET,
      env: "prod",
      store: stuckStore,
    });
    // 폴링 만료 후 직접 발급(가용성 우선) — 토큰을 받아낸다.
    expect(token).toBe("fallback-token");
    expect(callCount()).toBe(1);
  }, 5_000);

  it("[kv][AC-6] store 가 throw/null 만 줘도 fail-soft — 인메모리 직접 발급 성공", async () => {
    // 모든 store 메서드가 실패 신호(null/false)만 반환(Upstash 다운 시뮬레이션 — 실제 store 는 흡수).
    const downStore: KisStore = {
      async get<T>(): Promise<T | null> {
        return null;
      },
      async set(): Promise<void> {},
      async del(): Promise<void> {},
      async acquireLock(): Promise<string | null> {
        return null; // 락도 못 잡음.
      },
      async releaseLock(): Promise<void> {},
    };
    const { fetcher, callCount } = makeMockFetcher([
      { access_token: "soft-token", expires_in: 86_400 },
    ]);

    const token = await getAccessToken({
      fetcher,
      now: () => 0,
      appKey: APP_KEY,
      appSecret: APP_SECRET,
      env: "prod",
      store: downStore,
    });
    expect(token).toBe("soft-token");
    expect(callCount()).toBe(1);
  }, 5_000);

  it("[kv] store SET TTL = (만료 - grace) 초로 설정된다", async () => {
    const store = makeFakeStore();
    const { fetcher } = makeMockFetcher([
      { access_token: "ttl-token", expires_in: 3_600 }, // 1h.
    ]);
    await getAccessToken({
      fetcher,
      now: () => 0,
      appKey: APP_KEY,
      appSecret: APP_SECRET,
      env: "prod",
      store,
    });
    // TTL = (3600s - 60s grace) = 3540s.
    expect(store.setCalls()[0].ttlSec).toBe(3_540);
  });
});
