/**
 * `lib/api/kis/intstock-multprice.ts` — `fetchIntstockMultprice` 단위 테스트.
 *
 * PRD `watchlist-batch-quotes` AC-6 / §3.1:
 *   1. 3종목 → 1콜, 번호 인덱스 파라미터(`FID_*_1`~`_3`) + 좌조인 매핑.
 *   2. 31종목 → 30종목 단위 청크 분할(⌈N/30⌉=2콜).
 *   3. 응답 누락 종목은 결과에서 제외(좌조인 디그레이드).
 *   4. rt_cd != "0" → 비즈니스 에러 throw(한글 msg1).
 *   5. 청크 부분 성공 — 한 청크 실패해도 성공 청크 종목 반환. 전 청크 실패 시 throw.
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

import { fetchIntstockMultprice } from "../intstock-multprice";

function ok(items: Array<Record<string, string>>) {
  return {
    data: { rt_cd: "0", msg_cd: "MCA00000", msg1: "정상", output: items },
  };
}

function item(code: string, prpr: string, sign = "2") {
  return {
    inter_shrn_iscd: code,
    inter2_prpr: prpr,
    inter2_prdy_vrss: "100",
    prdy_vrss_sign: sign,
    prdy_ctrt: "1.0",
    acml_vol: "1000",
  };
}

describe("fetchIntstockMultprice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAccessToken.mockResolvedValue("token-xyz");
  });

  it("[#1] 3종목 → 1콜 + 번호 인덱스 파라미터 + 좌조인", async () => {
    mocks.get.mockResolvedValue(
      ok([
        item("005930", "71500"),
        item("000660", "175300", "5"),
        item("035420", "189500", "3"),
      ]),
    );

    const quotes = await fetchIntstockMultprice(["005930", "000660", "035420"]);

    expect(mocks.get).toHaveBeenCalledTimes(1); // 3종 = 1콜.
    const [, config] = mocks.get.mock.calls[0];
    expect(config.params.FID_COND_MRKT_DIV_CODE_1).toBe("J");
    expect(config.params.FID_INPUT_ISCD_1).toBe("005930");
    expect(config.params.FID_INPUT_ISCD_2).toBe("000660");
    expect(config.params.FID_INPUT_ISCD_3).toBe("035420");
    expect(config.headers.tr_id).toBe("FHKST11300006");
    expect(config.headers.custtype).toBe("P");

    expect(quotes.map((q) => q.ticker)).toEqual([
      "005930",
      "000660",
      "035420",
    ]);
    expect(quotes[0].price).toBe(71_500);
    expect(quotes[1].direction).toBe("down");
    expect(quotes[2].direction).toBe("flat");
  });

  it("[#2] 31종목 → 30 단위 청크 2콜", async () => {
    const tickers = Array.from({ length: 31 }, (_, i) =>
      String(i).padStart(6, "0"),
    );
    mocks.get.mockImplementation((_url: string, config) => {
      const codes: string[] = [];
      for (let n = 1; n <= 30; n += 1) {
        const c = config.params[`FID_INPUT_ISCD_${n}`];
        if (c) codes.push(c);
      }
      return Promise.resolve(ok(codes.map((c) => item(c, "100"))));
    });

    const quotes = await fetchIntstockMultprice(tickers);

    expect(mocks.get).toHaveBeenCalledTimes(2); // ⌈31/30⌉ = 2콜.
    expect(quotes).toHaveLength(31);
  });

  it("[#3] 응답 누락 종목은 결과에서 제외(좌조인)", async () => {
    mocks.get.mockResolvedValue(
      ok([item("005930", "71500"), item("035420", "189500")]),
    );

    const quotes = await fetchIntstockMultprice(["005930", "000660", "035420"]);

    expect(quotes.map((q) => q.ticker)).toEqual(["005930", "035420"]);
  });

  it("[#4] rt_cd != '0' → 비즈니스 에러 throw(한글 msg1)", async () => {
    mocks.get.mockResolvedValue({
      data: {
        rt_cd: "1",
        msg_cd: "EGW00123",
        msg1: "조회할 수 없는 종목코드입니다.",
        output: undefined,
      },
    });

    await expect(fetchIntstockMultprice(["999999"])).rejects.toMatchObject({
      message: "조회할 수 없는 종목코드입니다.",
    });
  });

  it("[#5] 청크 부분 성공 — 성공 청크 종목만 반환", async () => {
    const tickers = Array.from({ length: 31 }, (_, i) =>
      String(i).padStart(6, "0"),
    );
    let call = 0;
    mocks.get.mockImplementation((_url: string, config) => {
      call += 1;
      if (call === 2) return Promise.reject(new Error("두번째 청크 네트워크 오류"));
      const codes: string[] = [];
      for (let n = 1; n <= 30; n += 1) {
        const c = config.params[`FID_INPUT_ISCD_${n}`];
        if (c) codes.push(c);
      }
      return Promise.resolve(ok(codes.map((c) => item(c, "100"))));
    });

    const quotes = await fetchIntstockMultprice(tickers);
    expect(mocks.get).toHaveBeenCalledTimes(2);
    expect(quotes).toHaveLength(30); // 첫 청크(30종)만 성공.
  });

  it("[#5b] 전 청크 실패 → throw", async () => {
    mocks.get.mockRejectedValue(new Error("네트워크 오류"));
    await expect(
      fetchIntstockMultprice(["005930", "000660"]),
    ).rejects.toBeTruthy();
  });
});
