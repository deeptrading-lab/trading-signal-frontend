/**
 * `lib/api/toss/warnings.ts` 단위 테스트 — 매수 유의사항 never-throw 로더.
 *
 * PRD `stock-warnings` AC-1·5·6·8 회귀 차단:
 *   - 키 미설정 = 빈 배열 + 토스 무호출 (동료 로컬 무영향)
 *   - 실패(404 포함) = 빈 배열 + 실패 캐시 (throw 전파 없음)
 *   - unknown warningType 통과 / warningType 없는 행 필터
 *   - 성공 캐시 TTL + single-flight (동시 요청 1콜)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchActiveWarnings, resetWarningsForTest } from "../warnings";
import { isTossConfigured, tossGet } from "../client";

vi.mock("../client", () => ({
  isTossConfigured: vi.fn(),
  tossGet: vi.fn(),
}));

const mockConfigured = vi.mocked(isTossConfigured);
const mockTossGet = vi.mocked(tossGet);

beforeEach(() => {
  vi.clearAllMocks();
  resetWarningsForTest();
  mockConfigured.mockReturnValue(true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("fetchActiveWarnings", () => {
  it("토스 키 미설정이면 빈 배열 — 토스 호출 자체가 없다 (AC-1)", async () => {
    mockConfigured.mockReturnValue(false);
    await expect(fetchActiveWarnings("005930")).resolves.toEqual([]);
    expect(mockTossGet).not.toHaveBeenCalled();
  });

  it("활성 경보를 정규화해 반환하고 심볼을 경로에 인코딩한다", async () => {
    mockTossGet.mockResolvedValue([
      { warningType: "OVERHEATED", exchange: null, startDate: null, endDate: null },
    ]);

    await expect(fetchActiveWarnings("111710")).resolves.toEqual([
      { warningType: "OVERHEATED", exchange: null, startDate: null, endDate: null },
    ]);
    expect(mockTossGet).toHaveBeenCalledWith("/api/v1/stocks/111710/warnings");
  });

  it("warningType 없는 행은 거르고 unknown code 는 그대로 통과시킨다 (AC-5)", async () => {
    mockTossGet.mockResolvedValue([
      { exchange: "KRX" }, // warningType 누락 → 제거
      { warningType: "FUTURE_NEW_CODE", startDate: "2026-07-01" },
      { warningType: "VI_STATIC", exchange: "KRX" },
    ]);

    await expect(fetchActiveWarnings("005930")).resolves.toEqual([
      {
        warningType: "FUTURE_NEW_CODE",
        exchange: null,
        startDate: "2026-07-01",
        endDate: null,
      },
      { warningType: "VI_STATIC", exchange: "KRX", startDate: null, endDate: null },
    ]);
  });

  it("조회 실패는 빈 배열로 수렴하고 실패 캐시가 재시도를 억제한다 (AC-6)", async () => {
    mockTossGet.mockRejectedValue(new Error("toss 500"));

    await expect(fetchActiveWarnings("005930")).resolves.toEqual([]);
    await expect(fetchActiveWarnings("005930")).resolves.toEqual([]);
    expect(mockTossGet).toHaveBeenCalledTimes(1);
  });

  it("성공 캐시 — TTL 내 재호출은 토스를 다시 부르지 않는다 (AC-8)", async () => {
    mockTossGet.mockResolvedValue([{ warningType: "OVERHEATED" }]);

    await fetchActiveWarnings("111710");
    await fetchActiveWarnings("111710");
    expect(mockTossGet).toHaveBeenCalledTimes(1);
  });

  it("TTL(60s) 경과 후에는 재조회한다", async () => {
    vi.useFakeTimers();
    mockTossGet.mockResolvedValue([{ warningType: "OVERHEATED" }]);

    await fetchActiveWarnings("111710");
    vi.advanceTimersByTime(61_000);
    await fetchActiveWarnings("111710");
    expect(mockTossGet).toHaveBeenCalledTimes(2);
  });

  it("동시 요청은 single-flight 로 1콜에 수렴한다 (AC-8)", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    mockTossGet.mockImplementation(
      () => new Promise((resolve) => (resolveFetch = resolve)),
    );

    const p1 = fetchActiveWarnings("005930");
    const p2 = fetchActiveWarnings("005930");
    resolveFetch([{ warningType: "INVESTMENT_WARNING" }]);

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual(r2);
    expect(mockTossGet).toHaveBeenCalledTimes(1);
  });

  it("스펙 패턴 밖 심볼·빈 심볼은 호출 없이 빈 배열", async () => {
    await expect(fetchActiveWarnings("00 5930")).resolves.toEqual([]);
    await expect(fetchActiveWarnings("")).resolves.toEqual([]);
    expect(mockTossGet).not.toHaveBeenCalled();
  });

  it("점/하이픈만으로 된 심볼·과길이 심볼은 거부한다 (리뷰 F-1 — URL 경로 이탈 차단)", async () => {
    await expect(fetchActiveWarnings("..")).resolves.toEqual([]);
    await expect(fetchActiveWarnings(".")).resolves.toEqual([]);
    await expect(fetchActiveWarnings("-.-")).resolves.toEqual([]);
    await expect(fetchActiveWarnings("A".repeat(21))).resolves.toEqual([]);
    expect(mockTossGet).not.toHaveBeenCalled();
  });

  it("캐시가 상한(512)에서 가장 오래된 키를 축출한다 (리뷰 F-2 — 무한 성장 차단)", async () => {
    mockTossGet.mockResolvedValue([]);

    for (let i = 0; i < 513; i += 1) {
      await fetchActiveWarnings(`T${String(i).padStart(5, "0")}`);
    }
    expect(mockTossGet).toHaveBeenCalledTimes(513);

    // 최초 키(T00000)는 축출됐으므로 재조회가 발생, 최신 키(T00512)는 캐시 히트.
    await fetchActiveWarnings("T00000");
    expect(mockTossGet).toHaveBeenCalledTimes(514);
    await fetchActiveWarnings("T00512");
    expect(mockTossGet).toHaveBeenCalledTimes(514);
  });

  it("소문자 미국 티커는 대문자로 정규화해 조회·캐시한다", async () => {
    mockTossGet.mockResolvedValue([]);

    await fetchActiveWarnings("aapl");
    await fetchActiveWarnings("AAPL");
    expect(mockTossGet).toHaveBeenCalledTimes(1);
    expect(mockTossGet).toHaveBeenCalledWith("/api/v1/stocks/AAPL/warnings");
  });
});
