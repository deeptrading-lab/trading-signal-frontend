import { AxiosHeaders, type AxiosResponse } from "axios";
import { afterEach, expect, it, vi } from "vitest";
import { fetchCandlesPage } from "../candles";
import { getTossClient, resetTossClientForTest, tossGet } from "../client";
import { invalidateTossToken } from "../token";

vi.mock("../token", () => ({ getTossAccessToken: vi.fn(async () => "fixture"), invalidateTossToken: vi.fn() }));

afterEach(() => {
  resetTossClientForTest();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.useRealTimers();
});

it("replaces a revoked token and retries an ordinary GET only once", async () => {
  const revoked = { ...reply(401), data: { error: { code: "token-revoked" } } };
  const get = vi.spyOn(getTossClient(), "get").mockResolvedValueOnce(revoked).mockResolvedValue(reply(200));
  await expect(tossGet("/api/v1/prices")).resolves.toEqual({ candles: [] });
  expect(invalidateTossToken).toHaveBeenCalledExactlyOnceWith("fixture");
  expect(get).toHaveBeenCalledTimes(2);

  get.mockResolvedValue(revoked);
  await expect(tossGet("/api/v1/prices")).rejects.toMatchObject({ status: 401 });
  expect(get).toHaveBeenCalledTimes(4);
});

it("invalidates a revoked paper token but preserves the 60 second request limit", async () => {
  vi.useFakeTimers();
  const get = vi.spyOn(getTossClient(), "get")
    .mockResolvedValueOnce({ ...reply(401), data: { error: { code: "token-revoked" } } })
    .mockResolvedValue(reply(200));
  await expect(tossGet("/api/v1/prices", {}, "program-paper")).rejects.toMatchObject({ status: 401 });
  expect(invalidateTossToken).toHaveBeenCalledExactlyOnceWith("fixture");
  await expect(tossGet("/api/v1/prices", {}, "program-paper")).rejects.toMatchObject({ status: 503 });
  expect(get).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(60_000);
  await expect(tossGet("/api/v1/prices", {}, "program-paper")).resolves.toEqual({ candles: [] });
  expect(get).toHaveBeenCalledTimes(2);
});

it("shares Retry-After across trade and orderbook requests while stock lookups stay available", async () => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0);
  const get = vi.spyOn(getTossClient(), "get");
  get.mockResolvedValueOnce({
    status: 429,
    data: { error: { code: "too-many-requests" } },
    headers: new AxiosHeaders({ "retry-after": "12" }),
  } as AxiosResponse);
  get.mockResolvedValue({ status: 200, data: { result: "ok" } } as AxiosResponse);
  await expect(tossGet("/api/v1/trades")).rejects.toMatchObject({ status: 429 });
  await expect(tossGet("/api/v1/trades")).rejects.toMatchObject({ status: 429 });
  expect(get).toHaveBeenCalledTimes(1);
  await expect(tossGet("/api/v1/orderbook")).rejects.toMatchObject({ status: 429 });
  await expect(tossGet("/api/v1/stocks")).resolves.toBe("ok");
  await vi.advanceTimersByTimeAsync(12_000);
  await expect(tossGet("/api/v1/orderbook")).resolves.toBe("ok");
  expect(get).toHaveBeenCalledTimes(3);
});


function reply(status: number, headers: Record<string, string> = {}): AxiosResponse {
  return {
    status,
    headers: new AxiosHeaders(headers),
    data: status === 200 ? { result: { candles: [] } } : { error: { code: "rate-limit-exceeded" } },
  } as AxiosResponse;
}

it("spreads simultaneous stock master and warning calls across the shared quota", async () => {
  vi.useFakeTimers();
  const startedAt = Date.now();
  const sent: number[] = [];
  vi.spyOn(getTossClient(), "get").mockImplementation(async () => {
    sent.push(Date.now() - startedAt);
    return reply(200);
  });
  const requests = Promise.all([
    tossGet("/api/v1/stocks"),
    ...["005930", "000660", "035720", "005380", "051910"].map(ticker =>
      tossGet(`/api/v1/stocks/${ticker}/warnings`)),
  ]);
  await vi.runAllTimersAsync();
  await expect(requests).resolves.toHaveLength(6);
  expect(sent).toEqual([0, 250, 500, 750, 1_000, 1_250]);
});

it("paces a stock warning retry and its queued peer after the shared cooldown", async () => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0);
  const startedAt = Date.now();
  const sent: number[] = [];
  vi.spyOn(getTossClient(), "get").mockImplementation(async () => {
    sent.push(Date.now() - startedAt);
    return sent.length === 1 ? reply(429, { "retry-after": "2" }) : reply(200);
  });
  const requests = Promise.all([
    tossGet("/api/v1/stocks/005930/warnings"),
    tossGet("/api/v1/stocks/000660/warnings"),
  ]);
  await vi.advanceTimersByTimeAsync(1_999);
  expect(sent).toEqual([0]);
  await vi.advanceTimersByTimeAsync(251);
  await expect(requests).resolves.toHaveLength(2);
  expect(sent).toEqual([0, 2_000, 2_250]);
});

it("leaves transient paper candle failures to the next trading observation", async () => {
  const get = vi.spyOn(getTossClient(), "get").mockRejectedValue(new Error("temporary outage"));
  await expect(fetchCandlesPage("005930", "1m", { source: "program-paper" })).rejects.toMatchObject({
    message: "temporary outage",
  });
  expect(get).toHaveBeenCalledTimes(1);
});

it("coalesces identical candle pages and paces distinct pages before the HTTP request", async () => {
  vi.useFakeTimers();
  const startedAt = Date.now();
  const sent: number[] = [];
  const get = vi.spyOn(getTossClient(), "get").mockImplementation(async () => {
    sent.push(Date.now() - startedAt);
    return reply(200);
  });
  const pages = Promise.all([
    fetchCandlesPage("005930", "1m", { count: 5, source: "program-paper" }),
    fetchCandlesPage("005930", "1m", { count: 5 }),
    fetchCandlesPage("005930", "1d", { count: 5 }),
    fetchCandlesPage("000660", "1m", { count: 5 }),
  ]);
  await vi.runAllTimersAsync();
  await expect(pages).resolves.toHaveLength(4);
  expect(get).toHaveBeenCalledTimes(3);
  expect(sent).toEqual([0, 1_000, 2_000]);
});

it("waits for a slow candle response before dispatching and does not retry a 429 immediately", async () => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0);
  const log = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const startedAt = Date.now();
  const sent: number[] = [];
  vi.spyOn(getTossClient(), "get").mockImplementation(async () => {
    sent.push(Date.now() - startedAt);
    if (sent.length !== 1) return reply(200);
    await new Promise(resolve => setTimeout(resolve, 1_200));
    return reply(429, { "x-ratelimit-limit": "20", "x-ratelimit-remaining": "19", "x-ratelimit-reset": "1" });
  });

  const requests = Promise.allSettled([
    fetchCandlesPage("005930", "1m", { source: "program-paper" }),
    fetchCandlesPage("000660", "1d"),
  ]);
  await vi.advanceTimersByTimeAsync(1_000);
  expect(sent).toEqual([0]);
  await vi.advanceTimersByTimeAsync(200);
  expect(await requests).toMatchObject([
    { status: "rejected", reason: { status: 429 } },
    { status: "rejected", reason: { status: 503 } },
  ]);
  await vi.advanceTimersByTimeAsync(3_000);
  await expect(fetchCandlesPage("005930", "1m")).resolves.toEqual({ candles: [] });
  expect(sent).toEqual([0, 4_200]);
  expect(log).toHaveBeenCalledWith(expect.stringContaining('"remaining":19'));
  expect(log).toHaveBeenCalledWith(expect.stringContaining('"kind":"rate-limit-recovered"'));
});

it("does not dispatch expired candle requests while other endpoints remain available", async () => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0);
  const get = vi.spyOn(getTossClient(), "get")
    .mockResolvedValueOnce(reply(429, { "retry-after": "12" }))
    .mockResolvedValue(reply(200));

  await expect(fetchCandlesPage("005930", "1m")).rejects.toMatchObject({ status: 429 });
  await expect(fetchCandlesPage("005930", "1m")).rejects.toMatchObject({
    status: 503, detail: { code: "toss-candle-queue-timeout" },
  });
  await expect(tossGet("/api/v1/trades")).resolves.toEqual({ candles: [] });
  expect(get).toHaveBeenCalledTimes(2);

  await vi.advanceTimersByTimeAsync(12_000);
  await expect(fetchCandlesPage("005930", "1m")).resolves.toEqual({ candles: [] });
  expect(get).toHaveBeenCalledTimes(3);
});

it("logs outbound traffic by API group and source when the provider returns 429", async () => {
  vi.useFakeTimers();
  const log = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const get = vi.spyOn(getTossClient(), "get").mockResolvedValue(reply(200));
  await tossGet("/api/v1/stocks/005930/warnings");
  await fetchCandlesPage("005930", "1m", { source: "program-paper" });
  await vi.advanceTimersByTimeAsync(4_900);
  get.mockResolvedValueOnce(reply(429, {
    "x-ratelimit-limit": "20", "x-ratelimit-remaining": "19", "retry-after": "8",
  }));
  await expect(fetchCandlesPage("000660", "1m")).rejects.toMatchObject({ status: 429 });
  await expect(fetchCandlesPage("035720", "1m")).rejects.toMatchObject({ status: 503 });
  expect(get).toHaveBeenCalledTimes(3);
  const rateLimitLogs = log.mock.calls
    .map(([line]) => JSON.parse(line.slice("[toss-rest] ".length)))
    .filter(event => event.kind === "rate-limit");
  expect(rateLimitLogs).toHaveLength(1);
  expect(rateLimitLogs[0]).toMatchObject({
    group: "MARKET_DATA_CHART", source: "stock-data",
    limitHeaders: { limit: "20", remaining: "19", retryAfter: "8" },
    traffic: {
      allSent: { last1s: 1, last5s: 3, last60s: 3 },
      groupSent: { last1s: 1, last5s: 2, last60s: 2 },
      previousGroupDispatchMs: 4_900,
      byGroupPathSource60s: [
        { group: "STOCK", path: "/api/v1/stocks/{symbol}/warnings", sent: 1, rateLimited: 0 },
        { source: "program-paper", sent: 1, rateLimited: 0 },
        { source: "stock-data", sent: 1, rateLimited: 1 },
      ],
    },
  });
});

it("slows down proactively when a successful response reports a smaller quota", async () => {
  vi.useFakeTimers();
  const startedAt = Date.now();
  const sent: number[] = [];
  vi.spyOn(getTossClient(), "get").mockImplementation(async () => {
    sent.push(Date.now() - startedAt);
    return reply(200, { "x-ratelimit-limit": "1", "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1.3" });
  });
  const requests = Promise.all([fetchCandlesPage("005930", "1m"), fetchCandlesPage("000660", "1m")]);
  await vi.runAllTimersAsync();
  await expect(requests).resolves.toHaveLength(2);
  expect(sent).toEqual([0, 1_300]);
});

it("shares the paper dispatch interval across rankings and prices and drops a 429 without a retry", async () => {
  vi.useFakeTimers();
  const get = vi.spyOn(getTossClient(), "get").mockResolvedValueOnce(reply(429, { "retry-after": "90" })).mockResolvedValue(reply(200));
  const log = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  await expect(tossGet("/api/v1/rankings", {}, "program-paper")).rejects.toMatchObject({ status: 429 });
  await expect(tossGet("/api/v1/prices", {}, "program-paper")).rejects.toMatchObject({ status: 503 });
  await expect(tossGet("/api/v1/prices")).resolves.toEqual({ candles: [] });
  await vi.advanceTimersByTimeAsync(89_999);
  await expect(tossGet("/api/v1/prices", {}, "program-paper")).rejects.toMatchObject({ status: 503 });
  expect(get).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(1);
  await expect(tossGet("/api/v1/prices", {}, "program-paper")).resolves.toEqual({ candles: [] });
  await vi.advanceTimersByTimeAsync(59_999);
  await expect(tossGet("/api/v1/rankings", {}, "program-paper")).rejects.toMatchObject({ status: 503 });
  await vi.advanceTimersByTimeAsync(1);
  await expect(tossGet("/api/v1/rankings", {}, "program-paper")).resolves.toEqual({ candles: [] });
  expect(get).toHaveBeenCalledTimes(4);
  expect(log).toHaveBeenCalledWith(expect.stringContaining('"group":"RANKING"'));
});
