/**
 * 토스 모드 현재가 KIS 메타 보강 — 배선(병합) 테스트.
 *
 * 라이브 검증은 KIS 야간 점검 창(inquire-price 500)과 겹치면 불가능하므로, 병합 규칙을
 * 모킹으로 고정한다: 토스 값(가격·등락)은 그대로 두고 sector/foreignRatio 만 KIS 에서 합성,
 * KIS 실패 시 토스 응답 무손상 통과.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/api/toss/price", () => ({
  fetchStockPriceToss: vi.fn(),
  fetchStockPriceWithSharesToss: vi.fn(),
}));
vi.mock("../token", () => ({ getAccessToken: vi.fn().mockResolvedValue("tok") }));
vi.mock("../client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../client")>();
  return { ...actual, getKisClient: vi.fn() };
});

import { fetchStockPrice } from "../price";
import { getKisClient } from "../client";
import { fetchStockPriceToss } from "@/lib/api/toss/price";
import type { StockPrice } from "../types";

function tossPrice(ticker: string): StockPrice {
  return {
    ticker,
    name: "삼성전자",
    price: 290_500,
    change: -25_500,
    changePercent: -8.07,
    direction: "down",
    volume: 68_972_389,
    sector: undefined,
    foreignRatio: undefined,
  };
}

beforeEach(() => {
  vi.stubEnv("MARKET_DATA_SOURCE", "toss");
  vi.stubEnv("TOSS_CLIENT_ID", "id");
  vi.stubEnv("TOSS_CLIENT_SECRET", "secret");
  vi.stubEnv("KIS_APP_KEY", "kis-key");
  vi.stubEnv("KIS_APP_SECRET", "kis-secret");
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("fetchStockPrice — 토스 성공 + KIS 메타 보강", () => {
  it("토스 가격·등락은 유지하고 sector/foreignRatio 만 KIS 값으로 채운다", async () => {
    // 캐시가 모듈 전역이라 테스트 간 간섭 방지 위해 티커를 달리한다.
    vi.mocked(fetchStockPriceToss).mockResolvedValue(tossPrice("000001"));
    vi.mocked(getKisClient).mockReturnValue({
      get: vi.fn().mockResolvedValue({
        data: {
          rt_cd: "0",
          msg_cd: "MCA00000",
          msg1: "정상",
          output: {
            stck_prpr: "286000", // KIS 가격 — 병합 시 무시돼야 함(토스 가격 유지)
            prdy_vrss: "-28500",
            prdy_ctrt: "-9.06",
            prdy_vrss_sign: "5",
            acml_vol: "38905074",
            bstp_kor_isnm: "전기·전자",
            frgn_hldn_qty: "2900000000",
            lstn_stcn: "5846278608",
          },
        },
      }),
    } as never);

    const result = await fetchStockPrice("000001");

    expect(result.price).toBe(290_500); // 토스 실시간가 유지 (KIS 286,000 아님)
    expect(result.changePercent).toBe(-8.07);
    expect(result.sector).toBe("전기·전자"); // KIS 보강
    expect(result.foreignRatio).toBeCloseTo(49.6, 1); // 29억/58.46억 × 100
  });

  it("KIS 보강 실패 시 토스 응답 무손상 통과 (best-effort)", async () => {
    vi.mocked(fetchStockPriceToss).mockResolvedValue(tossPrice("000002"));
    vi.mocked(getKisClient).mockReturnValue({
      get: vi.fn().mockRejectedValue(new Error("KIS 야간 점검 500")),
    } as never);

    const result = await fetchStockPrice("000002");

    expect(result.price).toBe(290_500);
    expect(result.sector).toBeUndefined();
    expect(result.foreignRatio).toBeUndefined();
  });
});
