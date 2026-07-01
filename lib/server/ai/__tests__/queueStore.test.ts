import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  claimNextPending,
  enqueueAnalysis,
  findActiveByTicker,
  getQueueDepth,
  isAnalysisQueueStoreConfigured,
  markDone,
  markFailed,
  recoverStuck,
} from "@/lib/server/ai/queueStore";

const ORIGINAL_ENV = { ...process.env };

function configureEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
}

function clearEnv() {
  delete process.env.SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}

/** PostgREST 응답 모킹 헬퍼. */
function jsonRes(body: unknown, init?: { ok?: boolean; status?: number; headers?: Record<string, string> }) {
  const headers = new Headers(init?.headers ?? {});
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    headers,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };
});

describe("analysis queue store — 미설정 fail-soft", () => {
  beforeEach(clearEnv);

  it("Supabase 미설정이면 enqueue=not_configured, 조회/카운트는 빈 결과", async () => {
    expect(isAnalysisQueueStoreConfigured()).toBe(false);
    await expect(enqueueAnalysis({ ticker: "005930" })).resolves.toEqual({
      status: "not_configured",
    });
    await expect(findActiveByTicker("005930")).resolves.toBeNull();
    await expect(claimNextPending("worker-1")).resolves.toBeNull();
    await expect(getQueueDepth()).resolves.toBe(0);
    await expect(recoverStuck(60_000)).resolves.toBe(0);
    // markDone/markFailed 는 throw 하지 않고 no-op.
    await expect(markDone(1)).resolves.toBeUndefined();
    await expect(markFailed(1, "x")).resolves.toBeUndefined();
  });
});

describe("analysis queue store — 중복 가드", () => {
  beforeEach(configureEnv);

  it("같은 ticker 활성 row 존재 시 INSERT 없이 already 반환", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      // findActiveByTicker → 활성 row 1건 반환.
      jsonRes([
        {
          id: 7,
          ticker: "005930",
          status: "processing",
          force: false,
          worker_id: "worker-1",
          error: null,
          requested_by: null,
          created_at: "2026-06-29T00:00:00.000Z",
          claimed_at: "2026-06-29T00:00:01.000Z",
          finished_at: null,
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await enqueueAnalysis({ ticker: "005930" });

    expect(result).toEqual({ status: "already", id: 7 });
    // 활성 조회 1번만 — POST(INSERT) 는 호출되지 않아야 한다.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("활성 row 없으면 pending INSERT 후 queued + id 반환", async () => {
    const fetchMock = vi
      .fn()
      // 1) findActiveByTicker → 빈 배열(활성 없음).
      .mockResolvedValueOnce(jsonRes([]))
      // 2) INSERT → 생성된 row 반환.
      .mockResolvedValueOnce(
        jsonRes([
          {
            id: 42,
            ticker: "005930",
            status: "pending",
            force: false,
            worker_id: null,
            error: null,
            requested_by: null,
            created_at: "2026-06-29T00:00:00.000Z",
            claimed_at: null,
            finished_at: null,
          },
        ]),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await enqueueAnalysis({ ticker: "005930", force: true });

    expect(result).toEqual({ status: "queued", id: 42 });
    // 2번째 호출이 POST INSERT 인지 + force 반영 확인.
    const insertCall = fetchMock.mock.calls[1];
    expect(insertCall[1]).toEqual(
      expect.objectContaining({ method: "POST" }),
    );
    expect(insertCall[1].body).toContain("\"status\":\"pending\"");
    expect(insertCall[1].body).toContain("\"force\":true");
  });

  it("종목명이 있으면 INSERT body 에 name 포함, 없으면 생략(decision-stock-name)", async () => {
    // name 있는 경우.
    const withName = vi
      .fn()
      .mockResolvedValueOnce(jsonRes([]))
      .mockResolvedValueOnce(jsonRes([{ id: 7 }]));
    vi.stubGlobal("fetch", withName);
    await enqueueAnalysis({ ticker: "247540", name: "에코프로비엠" });
    expect(withName.mock.calls[1][1].body).toContain('"name":"에코프로비엠"');

    // name 없는 경우 — 키 생략(컬럼 default null).
    const noName = vi
      .fn()
      .mockResolvedValueOnce(jsonRes([]))
      .mockResolvedValueOnce(jsonRes([{ id: 8 }]));
    vi.stubGlobal("fetch", noName);
    await enqueueAnalysis({ ticker: "005930" });
    expect(noName.mock.calls[1][1].body).not.toContain('"name"');
  });
});

describe("analysis queue store — claim", () => {
  beforeEach(configureEnv);

  it("pending 없으면 null", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes([]));
    vi.stubGlobal("fetch", fetchMock);
    await expect(claimNextPending("worker-1")).resolves.toBeNull();
    // 조건부 UPDATE 까지 가지 않고 조회에서 멈춤.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("pending → processing 전이 후 row 반환", async () => {
    const fetchMock = vi
      .fn()
      // 1) 가장 오래된 pending 1건 조회.
      .mockResolvedValueOnce(jsonRes([{ id: 5 }]))
      // 2) 조건부 PATCH → 전이된 row 반환.
      .mockResolvedValueOnce(
        jsonRes([
          {
            id: 5,
            ticker: "000660",
            status: "processing",
            force: false,
            worker_id: "worker-1",
            error: null,
            requested_by: null,
            created_at: "2026-06-29T00:00:00.000Z",
            claimed_at: "2026-06-29T00:01:00.000Z",
            finished_at: null,
          },
        ]),
      );
    vi.stubGlobal("fetch", fetchMock);

    const row = await claimNextPending("worker-1");
    expect(row?.id).toBe(5);
    expect(row?.status).toBe("processing");
    expect(row?.workerId).toBe("worker-1");
    const patchCall = fetchMock.mock.calls[1];
    expect(patchCall[1]).toEqual(expect.objectContaining({ method: "PATCH" }));
    // 경합 가드: WHERE 에 status=eq.pending 포함.
    expect(String(patchCall[0])).toContain("status=eq.pending");
  });

  it("조건부 UPDATE 0행(다른 워커 선점)이면 null", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonRes([{ id: 5 }]))
      // PATCH 반영 0행 → 빈 배열.
      .mockResolvedValueOnce(jsonRes([]));
    vi.stubGlobal("fetch", fetchMock);
    await expect(claimNextPending("worker-1")).resolves.toBeNull();
  });

  it("claim 조회는 source=neq.bot 로 봇 행을 제외(봇은 자기 SSE 연결이 드레인 — 워커 이중실행 방지)", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonRes([])); // pending 없음
    vi.stubGlobal("fetch", fetchMock);
    await claimNextPending("worker-1");
    // 첫 호출(find 쿼리) URL 에 source=neq.bot 필터 포함.
    expect(String(fetchMock.mock.calls[0][0])).toContain("source=neq.bot");
  });
});

describe("analysis queue store — recoverStuck (1회 재투입 후 failed)", () => {
  beforeEach(configureEnv);

  it("첫 stuck 은 pending 재투입(마커 [recovered:1]), markFailed 호출 안 함", async () => {
    const fetchMock = vi
      .fn()
      // 1) stuck 조회 → error 마커 없는 row(첫 stuck).
      .mockResolvedValueOnce(
        jsonRes([{ id: 9, error: null, claimed_at: "2026-06-29T00:00:00.000Z" }]),
      )
      // 2) patchById(pending 재투입) → minimal 200.
      .mockResolvedValueOnce(jsonRes([], { headers: {} }));
    vi.stubGlobal("fetch", fetchMock);

    const recovered = await recoverStuck(20 * 60 * 1000);

    expect(recovered).toBe(1);
    const patchCall = fetchMock.mock.calls[1];
    expect(patchCall[1].body).toContain("\"status\":\"pending\"");
    expect(patchCall[1].body).toContain("[recovered:1]");
    // failed 로 전이하는 body 가 아니어야 함.
    expect(patchCall[1].body).not.toContain("\"status\":\"failed\"");
  });

  it("이미 [recovered:1] 인 row 가 또 stuck 이면 failed 종결", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonRes([
          { id: 9, error: "[recovered:1]", claimed_at: "2026-06-29T00:00:00.000Z" },
        ]),
      )
      // markFailed 의 patchById.
      .mockResolvedValueOnce(jsonRes([]));
    vi.stubGlobal("fetch", fetchMock);

    const recovered = await recoverStuck(20 * 60 * 1000);

    expect(recovered).toBe(1);
    const patchCall = fetchMock.mock.calls[1];
    expect(patchCall[1].body).toContain("\"status\":\"failed\"");
  });

  it("stuck row 없으면 0 + UPDATE 미호출", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes([]));
    vi.stubGlobal("fetch", fetchMock);
    await expect(recoverStuck(20 * 60 * 1000)).resolves.toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("봇 처리행이 55분 미만이면 건드리지 않음(건강한 장시간 분석 오탐 종결 방지)", async () => {
    // 30분 전 claim → 봇 분석은 최대 ~50분 정상 실행 → 아직 진행 중일 수 있어 skip.
    const recentClaim = new Date(Date.now() - 30 * 60_000).toISOString();
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonRes([{ id: 11, error: null, claimed_at: recentClaim, source: "bot" }]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const recovered = await recoverStuck(20 * 60 * 1000);

    expect(recovered).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1); // 조회만 — 종결 PATCH 없음
  });

  it("봇 처리행이 55분 초과면 failed 종결(연결 유실 — 재투입 안 함)", async () => {
    const staleClaim = new Date(Date.now() - 60 * 60_000).toISOString(); // 60분 전 → 55분 초과
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonRes([{ id: 12, error: null, claimed_at: staleClaim, source: "bot" }]),
      )
      // markFailed 의 patchById.
      .mockResolvedValueOnce(jsonRes([]));
    vi.stubGlobal("fetch", fetchMock);

    const recovered = await recoverStuck(20 * 60 * 1000);

    expect(recovered).toBe(1);
    const patchCall = fetchMock.mock.calls[1];
    expect(patchCall[1].body).toContain("\"status\":\"failed\"");
    // 봇 행은 재투입(pending)이 아니라 failed 여야 한다.
    expect(patchCall[1].body).not.toContain("\"status\":\"pending\"");
  });
});

describe("analysis queue store — getQueueDepth", () => {
  beforeEach(configureEnv);

  it("Content-Range total 을 우선 파싱", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonRes([{ id: 1 }, { id: 2 }], {
        headers: { "content-range": "0-2/3" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(getQueueDepth()).resolves.toBe(3);
  });

  it("Content-Range 없으면 body 길이로 폴백", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes([{ id: 1 }, { id: 2 }]));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getQueueDepth()).resolves.toBe(2);
  });
});

describe("analysis queue store — fail-soft 예외 흡수", () => {
  beforeEach(configureEnv);

  it("fetch 예외 시 enqueue=error, 조회는 null/0 (throw 안 함)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    // findActiveByTicker 가 null 을 돌려주므로 enqueue 는 INSERT 시도 → 그 fetch 도 reject → error.
    const result = await enqueueAnalysis({ ticker: "005930" });
    expect(result).toEqual(
      expect.objectContaining({ status: "error" }),
    );
    await expect(findActiveByTicker("005930")).resolves.toBeNull();
    await expect(getQueueDepth()).resolves.toBe(0);

    warnSpy.mockRestore();
  });
});
