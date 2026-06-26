/**
 * 시황 분석 저장소 보존(롤링) 단위테스트 — PRD `market-analysis-cron` AC-1/2/3.
 *
 * `retentionCutoffIso`(순수) + `pruneOldMarketAnalyses`(fetch mock): 컷오프 손계산·
 * DELETE 필터·삭제건수 집계·미설정 skip·오류 fail-soft 회귀 차단.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MARKET_ANALYSIS_RETENTION_DAYS,
  pruneOldMarketAnalyses,
  retentionCutoffIso,
} from "@/lib/server/marketAnalysisStore";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };
});

function configureEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
}

function clearEnv() {
  delete process.env.SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}

describe("retentionCutoffIso (AC-1)", () => {
  it("now - retentionDays 의 ISO 와 손계산 일치", () => {
    const now = new Date("2026-06-27T00:00:00.000Z");
    // 기본 90일
    expect(retentionCutoffIso(now)).toBe("2026-03-29T00:00:00.000Z");
    // days 조정
    expect(retentionCutoffIso(now, 1)).toBe("2026-06-26T00:00:00.000Z");
    expect(retentionCutoffIso(now, 0)).toBe("2026-06-27T00:00:00.000Z");
  });

  it("기본 상수는 90", () => {
    expect(MARKET_ANALYSIS_RETENTION_DAYS).toBe(90);
  });
});

describe("pruneOldMarketAnalyses (AC-2/3)", () => {
  it("미설정이면 skipped(not_configured) — fetch 미호출", async () => {
    clearEnv();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(pruneOldMarketAnalyses()).resolves.toEqual({
      ok: true,
      skipped: true,
      reason: "not_configured",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("created_at=lt.<cutoff> 필터로 DELETE 호출하고 Content-Range 로 삭제건수 반환", async () => {
    configureEnv();
    const now = new Date("2026-06-27T00:00:00.000Z");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-range": "*/3" }),
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await pruneOldMarketAnalyses(MARKET_ANALYSIS_RETENTION_DAYS, now);

    expect(result).toEqual({ ok: true, skipped: false, deleted: 3 });
    const [urlArg, init] = fetchMock.mock.calls[0];
    // 한정 삭제 필터(전체 삭제 방지) + 컷오프가 90일 전
    expect((urlArg as URL).href).toContain("/rest/v1/market_analyses");
    expect((urlArg as URL).href).toContain("created_at=lt.2026-03-29T00%3A00%3A00.000Z");
    expect(init).toMatchObject({ method: "DELETE" });
  });

  it("삭제 0건(Content-Range 없음) → deleted=0", async () => {
    configureEnv();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(pruneOldMarketAnalyses()).resolves.toEqual({
      ok: true,
      skipped: false,
      deleted: 0,
    });
  });

  it("non-OK 응답 → fail-soft error(throw 안 함)", async () => {
    configureEnv();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers(),
      text: async () => "bad filter",
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await pruneOldMarketAnalyses();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("status=400");
  });

  it("fetch 예외 → fail-soft error(throw 안 함)", async () => {
    configureEnv();
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await pruneOldMarketAnalyses();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("network down");
  });
});
