/**
 * `lib/api/marketdata/source.ts` 단위 테스트.
 *
 * PRD `toss-market-data-adapter` 목표 2·3 — 소스 토글의 안전 게이트 회귀 차단:
 *   1. MARKET_DATA_SOURCE 미설정 → kis
 *   2. =toss 인데 토스 키 없음 → kis (동료 로컬 무영향 — 핵심 AC-1)
 *   3. =toss + 키 존재 → toss
 *   4. withTossFallback: toss 실패 + KIS 설정 → kisFn 폴백 / KIS 미설정 → 토스 에러 전파
 *   5. 소스가 kis 면 tossFn 은 아예 호출되지 않는다 (무회귀 경로)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  resetSourceLogForTest,
  resolveMarketDataSource,
  trackMarketDataSource,
  withTossFallback,
} from "../source";

function stubToggle(options: {
  source?: string;
  tossKeys?: boolean;
  kisKeys?: boolean;
}): void {
  vi.stubEnv("MARKET_DATA_SOURCE", options.source ?? "");
  vi.stubEnv("TOSS_CLIENT_ID", options.tossKeys ? "id" : "");
  vi.stubEnv("TOSS_CLIENT_SECRET", options.tossKeys ? "secret" : "");
  vi.stubEnv("KIS_APP_KEY", options.kisKeys === false ? "" : "kis-key");
  vi.stubEnv("KIS_APP_SECRET", options.kisKeys === false ? "" : "kis-secret");
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  resetSourceLogForTest();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("resolveMarketDataSource", () => {
  it("미설정이면 kis", () => {
    stubToggle({ tossKeys: true });
    expect(resolveMarketDataSource()).toBe("kis");
  });

  it("toss 지정 + 키 없음 → kis (동료 로컬 무영향)", () => {
    stubToggle({ source: "toss", tossKeys: false });
    expect(resolveMarketDataSource()).toBe("kis");
  });

  it("toss 지정 + 키 존재 → toss (대소문자·공백 허용)", () => {
    stubToggle({ source: " TOSS ", tossKeys: true });
    expect(resolveMarketDataSource()).toBe("toss");
  });

  it("알 수 없는 값은 kis", () => {
    stubToggle({ source: "naver", tossKeys: true });
    expect(resolveMarketDataSource()).toBe("kis");
  });
});

describe("withTossFallback", () => {
  it("소스가 kis 면 tossFn 을 호출하지 않는다", async () => {
    stubToggle({ tossKeys: true }); // 토글 미설정 → kis
    const tossFn = vi.fn().mockResolvedValue("toss");
    const kisFn = vi.fn().mockResolvedValue("kis");

    await expect(withTossFallback("테스트", tossFn, kisFn)).resolves.toBe("kis");
    expect(tossFn).not.toHaveBeenCalled();
  });

  it("toss 모드에서 tossFn 성공값을 그대로 반환한다", async () => {
    stubToggle({ source: "toss", tossKeys: true });
    const tossFn = vi.fn().mockResolvedValue("toss");
    const kisFn = vi.fn();

    await expect(withTossFallback("테스트", tossFn, kisFn)).resolves.toBe("toss");
    expect(kisFn).not.toHaveBeenCalled();
  });

  it("toss 실패 + KIS 설정 → kisFn 폴백 + warn 1줄", async () => {
    stubToggle({ source: "toss", tossKeys: true, kisKeys: true });
    const tossFn = vi.fn().mockRejectedValue(new Error("toss 죽음"));
    const kisFn = vi.fn().mockResolvedValue("kis");

    await expect(withTossFallback("테스트", tossFn, kisFn)).resolves.toBe("kis");
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it("최초 호출 1회만 소스 판정 로그를 남긴다 (toss 지정+키 없음 → 게이트 warn)", async () => {
    stubToggle({ source: "toss", tossKeys: false });
    const kisFn = vi.fn().mockResolvedValue("kis");
    await withTossFallback("테스트", vi.fn(), kisFn);
    await withTossFallback("테스트", vi.fn(), kisFn);
    const gateWarns = (console.warn as ReturnType<typeof vi.fn>).mock.calls.filter(
      (args) => String(args[0]).includes("미설정"),
    );
    expect(gateWarns).toHaveLength(1); // 프로세스당 1회
  });

  it("toss 실패 + KIS 미설정 → 토스 에러 전파 (mock 분기는 상위 라우트 책임)", async () => {
    stubToggle({ source: "toss", tossKeys: true, kisKeys: false });
    const tossError = new Error("toss 죽음");
    const tossFn = vi.fn().mockRejectedValue(tossError);
    const kisFn = vi.fn();

    await expect(withTossFallback("테스트", tossFn, kisFn)).rejects.toBe(tossError);
    expect(kisFn).not.toHaveBeenCalled();
  });
});

describe("trackMarketDataSource — X-Data-Source 관측성", () => {
  it("toss 서빙이면 servedSource='toss'", async () => {
    stubToggle({ source: "toss", tossKeys: true });
    const { result, servedSource } = await trackMarketDataSource(() =>
      withTossFallback("테스트", vi.fn().mockResolvedValue("toss-data"), vi.fn()),
    );
    expect(result).toBe("toss-data");
    expect(servedSource).toBe("toss");
  });

  it("토글 off(kis 직행)면 servedSource='kis'", async () => {
    stubToggle({ tossKeys: true });
    const { servedSource } = await trackMarketDataSource(() =>
      withTossFallback("테스트", vi.fn(), vi.fn().mockResolvedValue("kis-data")),
    );
    expect(servedSource).toBe("kis");
  });

  it("toss 실패 → KIS 폴백이면 servedSource='kis' (헤더는 데이터의 실제 출처)", async () => {
    stubToggle({ source: "toss", tossKeys: true, kisKeys: true });
    const { servedSource } = await trackMarketDataSource(() =>
      withTossFallback(
        "테스트",
        vi.fn().mockRejectedValue(new Error("toss 죽음")),
        vi.fn().mockResolvedValue("kis-data"),
      ),
    );
    expect(servedSource).toBe("kis");
  });

  it("다콜 중 일부만 폴백이면 'toss,kis' 혼합 표기", async () => {
    stubToggle({ source: "toss", tossKeys: true, kisKeys: true });
    const { servedSource } = await trackMarketDataSource(async () => {
      await withTossFallback("a", vi.fn().mockResolvedValue("t"), vi.fn());
      await withTossFallback(
        "b",
        vi.fn().mockRejectedValue(new Error("실패")),
        vi.fn().mockResolvedValue("k"),
      );
    });
    expect(servedSource).toBe("toss,kis");
  });

  it("추적 밖에서 호출해도 withTossFallback 은 정상 동작(기록만 생략)", async () => {
    stubToggle({ source: "toss", tossKeys: true });
    await expect(
      withTossFallback("테스트", vi.fn().mockResolvedValue("ok"), vi.fn()),
    ).resolves.toBe("ok");
  });

  it("시세 함수 미경유면 servedSource=null (라우트가 기본값 사용)", async () => {
    const { servedSource } = await trackMarketDataSource(async () => "no-fetch");
    expect(servedSource).toBeNull();
  });
});
