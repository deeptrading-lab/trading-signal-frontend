/**
 * `lib/api/kis/index-chart.ts` — `fetchIndexDailyChart` 단위 테스트.
 *
 * 회귀 배경: 종가 필드를 존재하지 않는 `bstp_nmix_clpr` 로 매핑해(실제 KIS 필드는
 * `bstp_nmix_prpr`) 지수 일봉이 항상 빈 배열이 됐고, excess 채점이 무한 pending 되던 사건.
 *
 * 검증:
 *   1. `bstp_nmix_prpr` 를 종가로 읽어 오름차순·종가>0 봉만 반환한다.
 *   2. output2 에 봉이 있는데 매핑 결과가 0건이면(종가 필드명 오기 등 스키마 불일치) throw.
 *   3. rt_cd != "0" → 비즈니스 에러 throw.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  getAccessToken: vi.fn(),
}));

vi.mock("../client", () => ({
  getKisClient: () => ({ get: mocks.get }),
}));
vi.mock("../token", () => ({
  getAccessToken: mocks.getAccessToken,
}));

import { fetchIndexDailyChart } from "../index-chart";

function ok(items: Array<Record<string, string>>) {
  return { data: { rt_cd: "0", msg_cd: "MCA00000", msg1: "정상", output2: items } };
}

/** 실제 KIS output2 봉 형태(종가 = bstp_nmix_prpr). */
function bar(date: string, prpr: string) {
  return {
    stck_bsop_date: date,
    bstp_nmix_prpr: prpr,
    bstp_nmix_oprc: prpr,
    bstp_nmix_hgpr: prpr,
    bstp_nmix_lwpr: prpr,
    acml_vol: "1000",
  };
}

describe("fetchIndexDailyChart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAccessToken.mockResolvedValue("token-xyz");
  });

  it("[#1] bstp_nmix_prpr 를 종가로 읽어 오름차순 반환", async () => {
    mocks.get.mockResolvedValue(
      ok([bar("20260710", "7475.94"), bar("20260713", "7258.00")]),
    );

    const candles = await fetchIndexDailyChart("0001", "20260701", "20260713");

    expect(candles).toEqual([
      { date: "2026-07-10", close: 7475.94 },
      { date: "2026-07-13", close: 7258 },
    ]);
    const [, config] = mocks.get.mock.calls[0];
    expect(config.headers.tr_id).toBe("FHKUP03500100");
    expect(config.params.FID_INPUT_ISCD).toBe("0001");
  });

  it("[#2] 종가 필드명 오기 등 스키마 불일치(봉 있는데 매핑 0건)면 throw", async () => {
    // 과거 회귀 재현: output2 에 봉은 있으나 종가 필드가 잘못돼(clpr) 전부 파싱 실패.
    mocks.get.mockResolvedValue(
      ok([
        { stck_bsop_date: "20260710", bstp_nmix_clpr: "7475.94" },
        { stck_bsop_date: "20260713", bstp_nmix_clpr: "7258.00" },
      ]),
    );

    await expect(fetchIndexDailyChart("0001", "20260701", "20260713")).rejects.toThrow();
  });

  it("[#3] 빈 output2 는 정상 빈 배열(스키마 가드 오발동 방지)", async () => {
    mocks.get.mockResolvedValue(ok([]));
    await expect(fetchIndexDailyChart("0001", "20260701", "20260713")).resolves.toEqual([]);
  });

  it("[#4] rt_cd != '0' → 비즈니스 에러 throw", async () => {
    mocks.get.mockResolvedValue({
      data: { rt_cd: "1", msg_cd: "EGW00201", msg1: "초당 거래건수 초과", output2: [] },
    });
    await expect(fetchIndexDailyChart("0001", "20260701", "20260713")).rejects.toThrow();
  });
});
