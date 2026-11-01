/**
 * `app/api/cron/swing-screener/route.ts` — PRD `swing-judgment` AC-2.2 · AC-2.4.
 *   1. 시크릿 불일치 → 401, 처리 미호출.
 *   2. KIS 비-prod → ok:false(kis-not-prod) + 마커.
 *   3. offset=0 이고 같은 거래일·버전 완료 마커 → skip:"done", 처리 미호출.
 *   4. 구간 처리 → next·집계 그대로 응답.
 *   5. finalize → 실패 ≤ 2% 면 ok 마커.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  isKisConfigured: vi.fn(),
  resolveKisEnv: vi.fn(),
  isSwingStoreConfigured: vi.fn(),
  resolveTradeDate: vi.fn(),
  runScreenerSlice: vi.fn(),
  readSwingScreenerMeta: vi.fn(),
  saveSwingScreenerMeta: vi.fn(),
}));

vi.mock("@/lib/api/kis", () => ({ isKisConfigured: mocks.isKisConfigured, resolveKisEnv: mocks.resolveKisEnv }));
vi.mock("@/lib/server/swing/store", () => ({ isSwingStoreConfigured: mocks.isSwingStoreConfigured }));
vi.mock("@/lib/server/swing/tradeDate", () => ({ resolveTradeDate: mocks.resolveTradeDate }));
vi.mock("@/lib/server/swing/pace", () => ({ createKisPacer: () => (fn: () => unknown) => fn() }));
vi.mock("@/lib/server/swing/screener", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/swing/screener")>("@/lib/server/swing/screener");
  return {
    isScreenerRunOk: actual.isScreenerRunOk,
    runScreenerSlice: mocks.runScreenerSlice,
    readSwingScreenerMeta: mocks.readSwingScreenerMeta,
    saveSwingScreenerMeta: mocks.saveSwingScreenerMeta,
  };
});

import { GET } from "../route";

const SECRET = "test-secret";
const req = (query = "", secret: string | null = SECRET) =>
  new NextRequest(`http://localhost/api/cron/swing-screener${query}`, {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = SECRET;
  mocks.isKisConfigured.mockReturnValue(true);
  mocks.resolveKisEnv.mockReturnValue("prod");
  mocks.isSwingStoreConfigured.mockReturnValue(true);
  mocks.resolveTradeDate.mockResolvedValue("2026-10-30");
  mocks.readSwingScreenerMeta.mockResolvedValue(null);
});

describe("GET /api/cron/swing-screener", () => {
  it("시크릿이 다르면 401", async () => {
    const res = await GET(req("?offset=0", "wrong"));
    expect(res.status).toBe(401);
    expect(mocks.runScreenerSlice).not.toHaveBeenCalled();
  });

  it("KIS 비-prod 면 ok:false(kis-not-prod)", async () => {
    mocks.resolveKisEnv.mockReturnValue("vps");
    const body = await (await GET(req("?offset=0"))).json();
    expect(body).toMatchObject({ ok: false, reason: "kis-not-prod" });
    expect(mocks.saveSwingScreenerMeta).toHaveBeenCalledWith(expect.objectContaining({ ok: false, reason: "kis-not-prod" }));
    expect(mocks.runScreenerSlice).not.toHaveBeenCalled();
  });

  it("같은 거래일·버전 완료 마커가 있으면 offset=0 에서 skip", async () => {
    mocks.readSwingScreenerMeta.mockResolvedValue({ at: "x", ok: true, tradeDate: "2026-10-30", version: "swing-v1" });
    const body = await (await GET(req("?offset=0"))).json();
    expect(body).toEqual({ ok: true, skip: "done", tradeDate: "2026-10-30" });
    expect(mocks.runScreenerSlice).not.toHaveBeenCalled();
  });

  it("구간 처리 — 시간 예산을 넘기면 next 로 이어받는다", async () => {
    mocks.runScreenerSlice.mockResolvedValue({ processed: 380, written: 170, prefiltered: 200, noBars: 3, failed: [{ ticker: "000001", error: "x" }], next: 780, universe: 2534 });
    const body = await (await GET(req("?offset=400&limit=400"))).json();
    expect(mocks.runScreenerSlice).toHaveBeenCalledWith(expect.objectContaining({ tradeDate: "2026-10-30", offset: 400, limit: 400 }));
    expect(body).toMatchObject({ ok: true, tradeDate: "2026-10-30", processed: 380, written: 170, failed: 1, next: 780 });
    expect(mocks.readSwingScreenerMeta).not.toHaveBeenCalled(); // offset>0 은 완료 마커를 보지 않는다
  });

  it("finalize — 실패 2% 이하면 ok 마커", async () => {
    const ok = await (await GET(req("?finalize=1&processed=2534&failed=10"))).json();
    expect(ok).toMatchObject({ ok: true, tradeDate: "2026-10-30" });
    expect(mocks.saveSwingScreenerMeta).toHaveBeenLastCalledWith(expect.objectContaining({ ok: true, tradeDate: "2026-10-30", version: "swing-v1" }));
    const bad = await (await GET(req("?finalize=1&processed=2534&failed=100"))).json();
    expect(bad.ok).toBe(false);
  });
});
