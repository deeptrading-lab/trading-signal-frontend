import { afterEach, describe, expect, it, vi } from "vitest";
import {
  HEARTBEAT_TTL_SEC,
  deleteWorkerHeartbeat,
  readWorkerHeartbeat,
  workerHeartbeatKey,
  writeWorkerHeartbeat,
  type WorkerHeartbeat,
} from "@/lib/server/ai/workerHeartbeat";
import { setKisStoreForTest, type KisStore } from "@/lib/api/kis/store";

/**
 * readWorkerHeartbeat 의 **degrade→throw 승격**(fail-safe)을 실제 코드로 검증한다.
 * queueStore 테스트는 readWorkerHeartbeat 를 통째로 목킹하므로 이 한 줄
 * (`if (hb === null && store.wasLastCallDegraded?.()) throw`)이 거기선 실행되지 않는다 → 여기서 직접 exercise.
 *
 * store 는 모듈이 실제로 쓰는 `getKisStore()` 캐시에 `setKisStoreForTest` 로 fake 를 주입해 제어한다.
 */

/** 최소 fake KisStore — get 결과와 wasLastCallDegraded 존재/값을 제어(그 외 메서드는 no-op). */
function makeStore(opts: {
  get: () => Promise<unknown>;
  /** undefined = 옵셔널 메서드 **미구현**(절대 degrade 안 하는 store 흉내). */
  degraded?: boolean;
  onSet?: (key: string, value: unknown, ttlSec: number) => void;
  onDel?: (key: string) => void;
}): KisStore {
  const base = {
    get: () => opts.get(),
    set: async (key: string, value: unknown, ttlSec: number) => {
      opts.onSet?.(key, value, ttlSec);
    },
    del: async (key: string) => {
      opts.onDel?.(key);
    },
    acquireLock: async () => null,
    releaseLock: async () => {},
  };
  const store =
    opts.degraded === undefined
      ? base
      : { ...base, wasLastCallDegraded: () => opts.degraded as boolean };
  return store as unknown as KisStore;
}

const HB: WorkerHeartbeat = { ts: 1_700_000_000_000, status: "busy", queueDepth: 2 };

afterEach(() => {
  setKisStoreForTest(null); // store 캐시 리셋(다음 테스트가 memory store 로 복귀)
  vi.restoreAllMocks();
});

describe("workerHeartbeat — 키 포맷", () => {
  it("workerHeartbeatKey 는 전역 키에 workerId 를 접미한다", () => {
    expect(workerHeartbeatKey("worker-abc")).toBe(
      "analysis:worker:heartbeat:worker-abc",
    );
  });
});

describe("workerHeartbeat — readWorkerHeartbeat degrade→throw 승격(fail-safe)", () => {
  it("(1) get→null + wasLastCallDegraded()→true 이면 throw(=INDETERMINATE, 사망 오판 금지)", async () => {
    setKisStoreForTest(makeStore({ get: async () => null, degraded: true }));
    await expect(readWorkerHeartbeat("worker-x")).rejects.toThrow();
  });

  it("(2) get→null + wasLastCallDegraded()→false 이면 null 반환(정당한 miss = 사망)", async () => {
    setKisStoreForTest(makeStore({ get: async () => null, degraded: false }));
    await expect(readWorkerHeartbeat("worker-x")).resolves.toBeNull();
  });

  it("(3) get→값 이면 그 값 반환(생존) — degrade 체크 단락(short-circuit)", async () => {
    setKisStoreForTest(makeStore({ get: async () => HB, degraded: true }));
    // hb 가 non-null 이라 degrade 여부와 무관하게 값을 그대로 돌려준다(throw 없음).
    await expect(readWorkerHeartbeat("worker-x")).resolves.toEqual(HB);
  });

  it("(4) wasLastCallDegraded 미구현 store + get→null 이면 throw 없이 null(옵셔널 메서드 계약)", async () => {
    setKisStoreForTest(makeStore({ get: async () => null })); // degraded 인자 없음 → 메서드 부재
    await expect(readWorkerHeartbeat("worker-x")).resolves.toBeNull();
  });
});

describe("workerHeartbeat — write/delete 는 워커별 키를 대상으로 한다", () => {
  it("writeWorkerHeartbeat 는 워커별 키에 TTL(HEARTBEAT_TTL_SEC)로 기록", async () => {
    const onSet = vi.fn();
    setKisStoreForTest(makeStore({ get: async () => null, onSet }));
    await writeWorkerHeartbeat("worker-y", HB);
    expect(onSet).toHaveBeenCalledWith(
      "analysis:worker:heartbeat:worker-y",
      HB,
      HEARTBEAT_TTL_SEC,
    );
  });

  it("deleteWorkerHeartbeat 는 워커별 키를 삭제(graceful shutdown 즉시 복구용)", async () => {
    const onDel = vi.fn();
    setKisStoreForTest(makeStore({ get: async () => null, onDel }));
    await deleteWorkerHeartbeat("worker-z");
    expect(onDel).toHaveBeenCalledWith("analysis:worker:heartbeat:worker-z");
  });
});
