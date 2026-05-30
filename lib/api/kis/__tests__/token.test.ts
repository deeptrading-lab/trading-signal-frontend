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
import {
  MemoryKisStore,
  UpstashKisStore,
  setKisStoreForTest,
  type KisStore,
  type RedisLike,
} from "../store";
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

  /**
   * [kv][AC-6 regression] store 도달 불가(degrade 신호 + 매 호출 지연) 시 **폴링 루프에 진입하지 않고**
   * 즉시 직접발급해야 한다(QA blocking 수정 단언). 기존 0ms-즉시-null fake 는 폴링 40회를 돌려도
   * 빨라서 starvation 을 못 잡았다 → degrade 신호 + per-call 지연으로 starvation 경로를 실제 재현.
   *
   * 핵심 단언: store get/acquireLock 호출이 **각각 1회뿐**(폴링이 추가 get 을 누적하지 않음) + 빠름.
   */
  it("[kv][AC-6] store 다운(degrade+지연) 시 폴링 starvation 없이 즉시 직접발급", async () => {
    let getCalls = 0;
    let acquireCalls = 0;
    // 도달 불가 store: 모든 호출이 짧게 지연(15ms)된 뒤 폴백 신호(null) + degraded=true.
    // 실 Upstash 의 600ms 타임아웃을 작은 값으로 축약(테스트가 실시간 2s+ 를 타지 않게).
    const CALL_DELAY_MS = 15;
    const downStore: KisStore = {
      async get<T>(): Promise<T | null> {
        getCalls += 1;
        await new Promise((r) => setTimeout(r, CALL_DELAY_MS));
        return null; // store 도달 불가 → miss 처럼 보이지만 실은 장애.
      },
      async set(): Promise<void> {},
      async del(): Promise<void> {},
      async acquireLock(): Promise<string | null> {
        acquireCalls += 1;
        await new Promise((r) => setTimeout(r, CALL_DELAY_MS));
        return null; // 락도 못 잡음(타임아웃 폴백).
      },
      async releaseLock(): Promise<void> {},
      // ★ 핵심: "정당한 miss/락-미획득" 이 아니라 "store 도달 불가" 임을 신호.
      wasLastCallDegraded: () => true,
    };
    const { fetcher, callCount } = makeMockFetcher([
      { access_token: "direct-issue", expires_in: 86_400 },
    ]);

    const startedAt = Date.now();
    const token = await getAccessToken({
      fetcher,
      now: () => 0,
      appKey: APP_KEY,
      appSecret: APP_SECRET,
      env: "prod",
      store: downStore,
    });
    const elapsed = Date.now() - startedAt;

    expect(token).toBe("direct-issue");
    expect(callCount()).toBe(1); // 직접발급 1회.
    // 폴링이 돌았다면 store.get 이 1 + POLL_MAX_ATTEMPTS(>=8) 회로 누적됐을 것.
    // L2 조회 get(1회)에서 이미 degrade 신호 → 락 시도조차 없이 즉시 직접발급(최단 short-circuit).
    expect(getCalls).toBe(1);
    expect(acquireCalls).toBe(0); // degrade 가 L2 조회 직후 감지 → acquireLock 미진입.
    // 폴링 누적(40×600ms≈27s) 없이 store 호출 1회분(≈15ms)만 → 라우트 타임아웃(5s) 한참 아래.
    expect(elapsed).toBeLessThan(500);
  }, 5_000);

  /**
   * [kv][AC-6] 실제 `UpstashKisStore` + redis 가 throw → degrade 신호가 자동으로 켜지고
   * 토큰 경로가 폴링 없이 즉시 직접발급. (token.ts↔store.ts degrade 배선 end-to-end 검증.)
   */
  it("[kv][AC-6] UpstashKisStore + redis throw → degrade 자동 감지 후 즉시 직접발급", async () => {
    const boom = () => Promise.reject(new Error("upstash unreachable"));
    const downRedis: RedisLike = {
      get: boom,
      set: boom,
      del: () => boom() as Promise<number>,
      eval: boom,
    };
    const store = new UpstashKisStore(downRedis);
    const { fetcher, callCount } = makeMockFetcher([
      { access_token: "upstash-down-direct", expires_in: 86_400 },
    ]);

    const startedAt = Date.now();
    const token = await getAccessToken({
      fetcher,
      now: () => 0,
      appKey: APP_KEY,
      appSecret: APP_SECRET,
      env: "prod",
      store,
    });
    const elapsed = Date.now() - startedAt;

    expect(token).toBe("upstash-down-direct");
    expect(callCount()).toBe(1);
    // get(L2 token) + acquireLock 만 degrade 폴백 → 폴링 없이 직접발급. throw 흡수라 호출은 즉시.
    expect(store.wasLastCallDegraded()).toBe(true);
    expect(elapsed).toBeLessThan(500);
  }, 5_000);

  /**
   * [kv][AC-3 보강] store 가 **정상**(degrade=false)인데 락만 미획득이면 폴링은 유지된다(무회귀).
   * store 가 잠시 비었다가 다른 인스턴스가 SET 하면 폴링이 그 값을 받아 수렴해야 한다.
   */
  it("[kv][AC-3] store 정상 + 락 미획득 → 폴링 유지(2회차 store hit 수렴)", async () => {
    let getCalls = 0;
    const entries = new Map<string, CacheEntryLike>();
    const liveButLocked: KisStore = {
      async get<T>(key: string): Promise<T | null> {
        getCalls += 1;
        // 첫 L2 조회는 miss, 두 번째 폴링 get 부터는 hit(다른 인스턴스가 채운 셈).
        if (getCalls >= 2) {
          entries.set(key, { token: "polled-token", expiresAt: 86_400_000 });
        }
        return (entries.get(key) as T | undefined) ?? null;
      },
      async set(): Promise<void> {},
      async del(): Promise<void> {},
      async acquireLock(): Promise<string | null> {
        return null; // 다른 인스턴스가 락 보유.
      },
      async releaseLock(): Promise<void> {},
      wasLastCallDegraded: () => false, // ★ store 는 정상 → 폴링해야 함.
    };
    const { fetcher, callCount } = makeMockFetcher([
      { access_token: "should-not-issue", expires_in: 86_400 },
    ]);

    const token = await getAccessToken({
      fetcher,
      now: () => 0,
      appKey: APP_KEY,
      appSecret: APP_SECRET,
      env: "prod",
      store: liveButLocked,
    });

    expect(token).toBe("polled-token"); // 폴링으로 store 수렴.
    expect(callCount()).toBe(0); // 직접발급 0 — 폴링이 살아있는 store 에서 받아옴.
  }, 5_000);
});
