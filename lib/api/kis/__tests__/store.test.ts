/**
 * `lib/api/kis/store.ts` 단위 테스트.
 *
 * PRD `kis-token-store` AC-1·AC-4·AC-6 — store 추상화·키 해시·fail-soft 검증.
 *   - MemoryKisStore: get/set TTL, del, 락 획득/미획득, releaseLock(compare-and-del).
 *   - UpstashKisStore: SET NX PX 락, JSON 직렬화/역직렬화, get hit/miss.
 *   - fail-soft: redis 가 throw/hang 해도 throw 없이 null/false 폴백.
 *   - hashAppKey: SHA-256 hex 앞 16자, 평문 미노출, 결정적.
 */

import { describe, it, expect, vi } from "vitest";
import {
  MemoryKisStore,
  UpstashKisStore,
  hashAppKey,
  type RedisLike,
} from "../store";

describe("hashAppKey", () => {
  it("[AC-4] SHA-256 hex 앞 16자 — 결정적이고 평문을 노출하지 않는다", () => {
    const appKey = "PSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    const h1 = hashAppKey(appKey);
    const h2 = hashAppKey(appKey);
    expect(h1).toBe(h2); // 결정적.
    expect(h1).toHaveLength(16);
    expect(h1).toMatch(/^[0-9a-f]{16}$/);
    expect(h1).not.toContain(appKey); // 평문 미포함.
  });

  it("appKey 가 다르면 해시도 다르다(env 분리 키 안정성)", () => {
    expect(hashAppKey("key-a")).not.toBe(hashAppKey("key-b"));
  });
});

describe("MemoryKisStore", () => {
  it("set 후 get 으로 값을 반환한다", async () => {
    const store = new MemoryKisStore();
    await store.set("k", { token: "t1" }, 60);
    expect(await store.get<{ token: string }>("k")).toEqual({ token: "t1" });
  });

  it("TTL 만료 시 null 을 반환한다", async () => {
    vi.useFakeTimers();
    const store = new MemoryKisStore();
    await store.set("k", "v", 1); // 1s TTL.
    expect(await store.get("k")).toBe("v");
    vi.advanceTimersByTime(1_500);
    expect(await store.get("k")).toBeNull();
    vi.useRealTimers();
  });

  it("del 후 get 은 null", async () => {
    const store = new MemoryKisStore();
    await store.set("k", "v", 60);
    await store.del("k");
    expect(await store.get("k")).toBeNull();
  });

  it("[AC-3] 같은 락 키는 1회만 획득되고 두 번째는 null", async () => {
    const store = new MemoryKisStore();
    const first = await store.acquireLock("lock", 10_000);
    const second = await store.acquireLock("lock", 10_000);
    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });

  it("releaseLock 으로 내 락만 해제 후 재획득 가능", async () => {
    const store = new MemoryKisStore();
    const token = await store.acquireLock("lock", 10_000);
    expect(token).not.toBeNull();
    await store.releaseLock("lock", token!);
    const reacquired = await store.acquireLock("lock", 10_000);
    expect(reacquired).not.toBeNull();
  });

  it("다른 토큰으로는 락이 해제되지 않는다(compare-and-del)", async () => {
    const store = new MemoryKisStore();
    await store.acquireLock("lock", 10_000);
    await store.releaseLock("lock", "not-my-token");
    expect(await store.acquireLock("lock", 10_000)).toBeNull();
  });
});

/** 최소 fake redis — 내부 Map + SET NX/PX + eval(compare-and-del) 흉내. */
function makeFakeRedis(): RedisLike & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    async get<T = unknown>(key: string): Promise<T | null> {
      return (store.has(key) ? (store.get(key) as unknown as T) : null);
    },
    async set(key, value, opts) {
      if (opts?.nx && store.has(key)) return null; // 이미 존재 → NX 실패.
      store.set(key, value);
      return "OK";
    },
    async del(...keys) {
      let n = 0;
      for (const k of keys) if (store.delete(k)) n += 1;
      return n;
    },
    async eval(_script, keys, args) {
      // compare-and-del: 값이 args[0] 과 같으면 삭제.
      const key = keys[0];
      if (store.get(key) === String(args[0])) {
        store.delete(key);
        return 1;
      }
      return 0;
    },
  };
}

describe("UpstashKisStore", () => {
  it("set 은 JSON 직렬화 후 저장, get 은 역직렬화", async () => {
    const redis = makeFakeRedis();
    const store = new UpstashKisStore(redis);
    await store.set("k", { token: "t1", expiresAt: 123 }, 60);
    expect(redis.store.get("k")).toBe('{"token":"t1","expiresAt":123}');
    expect(await store.get<{ token: string }>("k")).toEqual({
      token: "t1",
      expiresAt: 123,
    });
  });

  it("미존재 키는 null", async () => {
    const store = new UpstashKisStore(makeFakeRedis());
    expect(await store.get("missing")).toBeNull();
  });

  it("[AC-3] SET NX PX 락 — 1인스턴스만 획득, 둘째는 null", async () => {
    const redis = makeFakeRedis();
    const a = new UpstashKisStore(redis);
    const b = new UpstashKisStore(redis); // 같은 redis 공유.
    const lockA = await a.acquireLock("kis:lock:token:prod:abc", 10_000);
    const lockB = await b.acquireLock("kis:lock:token:prod:abc", 10_000);
    expect(lockA).not.toBeNull();
    expect(lockB).toBeNull();
  });

  it("releaseLock 후 재획득 가능(compare-and-del)", async () => {
    const redis = makeFakeRedis();
    const store = new UpstashKisStore(redis);
    const token = await store.acquireLock("lock", 10_000);
    await store.releaseLock("lock", token!);
    expect(await store.acquireLock("lock", 10_000)).not.toBeNull();
  });

  it("[AC-6] redis 가 throw 해도 get 은 null 폴백(fail-soft)", async () => {
    const redis = makeFakeRedis();
    redis.get = vi.fn().mockRejectedValue(new Error("upstash down"));
    const store = new UpstashKisStore(redis);
    await expect(store.get("k")).resolves.toBeNull();
  });

  it("[AC-6] redis 가 throw 해도 set/del/acquire/release 가 throw 하지 않는다", async () => {
    const redis = makeFakeRedis();
    const boom = vi.fn().mockRejectedValue(new Error("upstash down"));
    redis.set = boom;
    redis.del = boom;
    redis.eval = boom;
    const store = new UpstashKisStore(redis);
    await expect(store.set("k", "v", 60)).resolves.toBeUndefined();
    await expect(store.del("k")).resolves.toBeUndefined();
    await expect(store.acquireLock("lock", 1_000)).resolves.toBeNull();
    await expect(store.releaseLock("lock", "x")).resolves.toBeUndefined();
  });
});
