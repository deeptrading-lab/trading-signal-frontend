/**
 * `/api/scorecard/calibration` — 집계 적중률은 운영자 지표라 admin 전용(오픈베타 조건 5 "적중률 문구 0").
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const requireAdminApi = vi.fn();
const getAllScorecardRows = vi.fn();

vi.mock("@/lib/server/auth/apiGuard", () => ({ requireAdminApi: (r: NextRequest) => requireAdminApi(r) }));
vi.mock("@/lib/server/scorecard/scorecardStore", () => ({
  isScorecardStoreConfigured: () => true,
  getAllScorecardRows: () => getAllScorecardRows(),
}));

import { GET } from "../route";

const req = () => new NextRequest("http://localhost/api/scorecard/calibration");

describe("GET /api/scorecard/calibration", () => {
  beforeEach(() => {
    requireAdminApi.mockReset();
    getAllScorecardRows.mockReset().mockResolvedValue([]);
  });

  it("비관리자는 403 이고 채점 원장을 읽지 않는다", async () => {
    requireAdminApi.mockResolvedValue(NextResponse.json({ error: "forbidden" }, { status: 403 }));
    const res = await GET(req());
    expect(res.status).toBe(403);
    expect(getAllScorecardRows).not.toHaveBeenCalled();
  });

  it("관리자는 보정값을 받는다", async () => {
    requireAdminApi.mockResolvedValue(null);
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(getAllScorecardRows).toHaveBeenCalledOnce();
    expect(await res.json()).toMatchObject({ configured: true, calibrations: [] });
  });
});
