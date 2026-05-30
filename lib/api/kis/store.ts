/**
 * KIS 인스턴스 간 공유 store 추상화 — 토큰·지수 L2 캐시 + 분산 락.
 *
 * PRD `kis-token-store` §3.1·§3.4 — `KIS_TOKEN_STORE` 토글(`memory` | `kv`),
 * fail-soft(store 미설정/타임아웃/에러 시 인메모리 graceful degrade), SHA-256 앞 16자 키 해시.
 *
 * ## 설계
 *
 * - `KisStore` 인터페이스(get/set/del/acquireLock/releaseLock)에만 `token.ts`·지수 캐시가 의존.
 *   `@upstash/redis` 직접 import 는 본 모듈 안에서만(서버 전용 경계 — `client.ts` 와 동일).
 * - `KIS_TOKEN_STORE`:
 *   - `"memory"`(기본/미설정/로컬/테스트) → `MemoryKisStore`. 분산 락은 인스턴스 내 `Map` 기반
 *     로컬 락(인스턴스 간 의미 없음 — 인스턴스 내 single-flight 는 `inflight` Promise 가 담당).
 *   - `"kv"` → `UpstashKisStore`(`@upstash/redis` REST SDK). `SET NX PX` 락 + Lua compare-and-del.
 * - **fail-soft**: store 호출 자체에 짧은 타임아웃(기본 600ms)을 두고, 타임아웃·에러는 throw 가
 *   아니라 null/false 폴백 신호로 흡수(`withTimeoutSoft`). store 가 죽어도 호출 측은 인메모리로 동작.
 * - **테스트 가능성**: `getKisStore()` 가 모듈 캐시를 쓰되 `setKisStoreForTest()` 로 fake store 주입 가능.
 *   `UpstashKisStore` 는 redis 클라이언트 주입 가능(`token.ts` 의 fetcher 주입 패턴 정합).
 *
 * ## 환경변수
 *
 * - `KIS_TOKEN_STORE` ("memory" | "kv") — 미설정/오타/store 생성 실패 시 "memory" 폴백.
 * - `KV_REST_API_URL` / `UPSTASH_REDIS_REST_URL` — Upstash REST 엔드포인트(둘 중 흡수).
 * - `KV_REST_API_TOKEN` / `UPSTASH_REDIS_REST_TOKEN` — Upstash REST 토큰(둘 중 흡수).
 *   ⚠️ 서버 전용 — `NEXT_PUBLIC_` 금지. Vercel Marketplace Upstash 연결 시 자동 주입.
 */

import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";

/**
 * store 호출 타임아웃 — store 지연이 토큰/지수 응답을 늘어지게 하지 않도록 짧게(fail-soft §3.4).
 *
 * ⚠️ 폴링 루프(token.ts)는 이 타임아웃을 직렬 누적하면 라우트 타임아웃을 넘길 수 있으므로,
 * 폴링 진입 자체를 store 장애 신호(`wasLastCallDegraded`)로 막고, 폴링 중 store get 에는
 * 더 짧은 타임아웃(`STORE_POLL_TIMEOUT_MS`)을 별도 적용한다.
 */
const STORE_TIMEOUT_MS = 600;

/**
 * 폴링 중 store get 전용 짧은 타임아웃 — 폴링은 store 가 살아있다고 판단됐을 때만 진입하지만,
 * 폴링 도중 store 가 죽어도 누적 지연이 폭주하지 않도록 일반 호출보다 짧게(150ms) 둔다.
 */
const STORE_POLL_TIMEOUT_MS = 150;
export { STORE_POLL_TIMEOUT_MS };

/**
 * 인스턴스 간 공유 store 의 최소 인터페이스. token.ts·지수 캐시가 이 인터페이스에만 의존.
 *
 * 모든 메서드는 **throw 하지 않고** 실패 시 폴백 신호(null/false)를 반환한다(fail-soft).
 */
export interface KisStore {
  /**
   * 키 조회. 미존재·에러·타임아웃 시 null.
   * @param timeoutMs store 호출 타임아웃(ms) — 폴링 등에서 더 짧게 줄 수 있다. 기본은 store 정책값.
   */
  get<T>(key: string, timeoutMs?: number): Promise<T | null>;
  /** TTL(초) 설정. 에러·타임아웃은 흡수(반환값 없음). */
  set<T>(key: string, value: T, ttlSec: number): Promise<void>;
  /** 키 삭제. 에러·타임아웃은 흡수. */
  del(key: string): Promise<void>;
  /**
   * 분산 락 획득(`SET NX PX`). 성공 시 락 토큰(uuid), 실패·에러·타임아웃 시 null.
   * @param key 락 키.
   * @param ttlMs 락 TTL(ms) — 데드락 방지.
   */
  acquireLock(key: string, ttlMs: number): Promise<string | null>;
  /** 내 락만 해제(Lua compare-and-del). 에러·타임아웃은 흡수. */
  releaseLock(key: string, lockToken: string): Promise<void>;
  /**
   * **직전 store 호출이 장애(타임아웃·에러)로 폴백했는지** 신호(fail-soft 분기용).
   *
   * `null`(또는 false 락)에는 두 가지 의미가 섞인다: ① store 정상 + 정당한 miss/락-미획득,
   * ② store 도달 불가(타임아웃·에러)로 폴백. 호출 측(`token.ts`)이 둘을 구분해 ②면 폴링을
   * 건너뛰고 즉시 직접발급(fail-soft)할 수 있도록 직전 호출의 degrade 여부를 알린다.
   *
   * 선택 메서드 — MemoryKisStore·인메모리 fake 는 항상 `false`(장애 없음)로 간주(미구현 가능).
   * @returns 직전 get/set/del/acquireLock/releaseLock 가 타임아웃·에러로 폴백했으면 true.
   */
  wasLastCallDegraded?(): boolean;
}

/**
 * appKey 를 키·로그에 평문 노출하지 않기 위한 해시 — SHA-256 hex 앞 16자(PRD §3.5 q8).
 * 충돌 확률 무시 가능 + 키 길이 단축 + 같은 appKey → 같은 해시(키 안정성).
 */
export function hashAppKey(appKey: string): string {
  return createHash("sha256").update(appKey).digest("hex").slice(0, 16);
}

/** 락 토큰 생성 — compare-and-del 로 내 락만 해제하기 위한 소유자 식별자. */
function makeLockToken(): string {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** `withTimeoutSoft` 결과 — 값 + 장애(타임아웃·에러) 폴백 여부. */
type SoftResult<T> = { value: T; degraded: boolean };

/**
 * store 호출에 짧은 타임아웃 + 에러 흡수를 씌운다(fail-soft). 타임아웃·에러 시 fallback 반환.
 * store 는 최적화이지 SPOF 가 아니므로 어떤 실패도 throw 로 전파하지 않는다.
 *
 * @returns `{ value, degraded }` — degraded 는 타임아웃·에러로 폴백했는지(정상 완료면 false).
 *   호출 측이 "store 정상 + 정당한 miss" 와 "store 도달 불가" 를 구분하는 데 쓴다.
 */
async function withTimeoutSoft<T>(
  op: () => Promise<T>,
  fallback: T,
  ms = STORE_TIMEOUT_MS,
): Promise<SoftResult<T>> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const TIMED_OUT = Symbol("timeout");
  const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), ms);
  });
  try {
    const result = await Promise.race([op(), timeout]);
    if (result === TIMED_OUT) {
      return { value: fallback, degraded: true };
    }
    return { value: result as T, degraded: false };
  } catch {
    // store 에러는 폴백 신호로 흡수(로그는 호출 측 정책 — 여기선 조용히 degrade).
    return { value: fallback, degraded: true };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * 인메모리 store — `KIS_TOKEN_STORE=memory`(기본/로컬/테스트). 인스턴스 경계를 넘지 못한다.
 *
 * 분산 락은 인스턴스 내 `Map` 으로 흉내만 낸다(인스턴스 간 single-flight 보장 X — 그건 kv 의 몫,
 * 인스턴스 내 single-flight 는 token.ts 의 `inflight` Promise 가 담당). memory 모드의 토큰 흐름은
 * L1(token.ts cache) 만으로 현행과 동일하게 동작하므로 본 store 는 사실상 no-op 에 가깝다(무회귀).
 */
export class MemoryKisStore implements KisStore {
  private readonly entries = new Map<string, { value: unknown; expiresAt: number }>();
  private readonly locks = new Map<string, { token: string; expiresAt: number }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSec: number): Promise<void> {
    this.entries.set(key, { value, expiresAt: Date.now() + ttlSec * 1_000 });
  }

  async del(key: string): Promise<void> {
    this.entries.delete(key);
  }

  async acquireLock(key: string, ttlMs: number): Promise<string | null> {
    const existing = this.locks.get(key);
    if (existing && existing.expiresAt > Date.now()) return null;
    const token = makeLockToken();
    this.locks.set(key, { token, expiresAt: Date.now() + ttlMs });
    return token;
  }

  async releaseLock(key: string, lockToken: string): Promise<void> {
    const existing = this.locks.get(key);
    if (existing && existing.token === lockToken) this.locks.delete(key);
  }
}

/** Lua compare-and-del — 락 토큰이 내 것일 때만 삭제(다른 인스턴스 락 오삭제 방지). */
const RELEASE_LOCK_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end`;

/** Redis-호환 최소 클라이언트 표면 — 테스트 시 fake 주입(실제 `@upstash/redis` 의 부분집합). */
export interface RedisLike {
  get<T = unknown>(key: string): Promise<T | null>;
  set(
    key: string,
    value: string,
    opts?: { ex?: number; nx?: boolean; px?: number },
  ): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
  eval(
    script: string,
    keys: string[],
    args: (string | number)[],
  ): Promise<unknown>;
}

/**
 * Upstash Redis store — `KIS_TOKEN_STORE=kv`. REST 기반이라 serverless/Edge 호환.
 *
 * 모든 호출은 `withTimeoutSoft` 로 감싸 fail-soft(에러·타임아웃 → 폴백 신호). 값은 JSON 직렬화.
 */
export class UpstashKisStore implements KisStore {
  /** 직전 store 호출이 타임아웃·에러로 폴백했는지 — `wasLastCallDegraded()` 가 노출. */
  private lastDegraded = false;

  constructor(private readonly redis: RedisLike) {}

  /** `withTimeoutSoft` 를 실행하고 degrade 여부를 인스턴스에 기록한 뒤 값만 반환. */
  private async run<T>(
    op: () => Promise<T>,
    fallback: T,
    ms = STORE_TIMEOUT_MS,
  ): Promise<T> {
    const { value, degraded } = await withTimeoutSoft(op, fallback, ms);
    this.lastDegraded = degraded;
    return value;
  }

  wasLastCallDegraded(): boolean {
    return this.lastDegraded;
  }

  async get<T>(key: string, timeoutMs = STORE_TIMEOUT_MS): Promise<T | null> {
    return this.run<T | null>(
      async () => {
        const raw = await this.redis.get<unknown>(key);
        if (raw === null || raw === undefined) return null;
        // @upstash/redis 는 JSON 을 자동 역직렬화하기도 하므로 문자열·객체 모두 흡수.
        if (typeof raw === "string") {
          try {
            return JSON.parse(raw) as T;
          } catch {
            return raw as unknown as T;
          }
        }
        return raw as T;
      },
      null,
      timeoutMs,
    );
  }

  async set<T>(key: string, value: T, ttlSec: number): Promise<void> {
    await this.run(async () => {
      await this.redis.set(key, JSON.stringify(value), { ex: ttlSec });
      return undefined;
    }, undefined);
  }

  async del(key: string): Promise<void> {
    await this.run(async () => {
      await this.redis.del(key);
      return undefined;
    }, undefined);
  }

  async acquireLock(key: string, ttlMs: number): Promise<string | null> {
    const token = makeLockToken();
    return this.run<string | null>(async () => {
      const result = await this.redis.set(key, token, { nx: true, px: ttlMs });
      // SET NX 성공 → "OK"(또는 truthy). 실패(이미 잠김) → null.
      return result ? token : null;
    }, null);
  }

  async releaseLock(key: string, lockToken: string): Promise<void> {
    await this.run(async () => {
      await this.redis.eval(RELEASE_LOCK_LUA, [key], [lockToken]);
      return undefined;
    }, undefined);
  }
}

/**
 * Upstash REST 연결 env 를 두 네이밍에서 흡수(PRD §3.5 q2 방법 A). 둘 다 미설정이면 null.
 */
function resolveUpstashEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url?.trim() || !token?.trim()) return null;
  return { url, token };
}

/** 모듈 캐시 — store 인스턴스. */
let cachedStore: KisStore | null = null;

/**
 * 현행 모드에 맞는 store 를 반환. `kv` + Upstash env 정상 → `UpstashKisStore`,
 * 그 외(미설정·생성 실패·`memory`) → `MemoryKisStore`(fail-soft §3.4·무회귀 §3.1).
 */
export function getKisStore(): KisStore {
  if (cachedStore) return cachedStore;

  if (process.env.KIS_TOKEN_STORE === "kv") {
    const env = resolveUpstashEnv();
    if (env) {
      try {
        const redis = new Redis({
          url: env.url,
          token: env.token,
        }) as unknown as RedisLike;
        cachedStore = new UpstashKisStore(redis);
        return cachedStore;
      } catch {
        // 클라이언트 생성 실패 → memory 로 graceful degrade.
      }
    }
  }

  cachedStore = new MemoryKisStore();
  return cachedStore;
}

/** 테스트 전용 — fake store 주입(또는 null 로 캐시 리셋). */
export function setKisStoreForTest(store: KisStore | null): void {
  cachedStore = store;
}
