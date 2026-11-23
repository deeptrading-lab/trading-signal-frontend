import { AxiosHeaders, type AxiosResponse } from "axios";
import { afterEach, expect, it, vi } from "vitest";
import { fetchCandlesPage } from "../candles";
import { getTossClient, resetTossClientForTest, tossGet } from "../client";

vi.mock("../token", () => ({ getTossAccessToken: vi.fn(async () => "fixture"), invalidateTossToken: vi.fn() }));

afterEach(() => {
  resetTossClientForTest();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("honors a long Retry-After without issuing early requests on the same endpoint", async () => {
  vi.useFakeTimers();
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
  await expect(tossGet("/api/v1/orderbook")).resolves.toBe("ok");
  await vi.advanceTimersByTimeAsync(12_000);
  await expect(tossGet("/api/v1/trades")).resolves.toBe("ok");
  expect(get).toHaveBeenCalledTimes(3);
});


function reply(status: number, headers: Record<string, string> = {}): AxiosResponse {
  return {
    status,
    headers: new AxiosHeaders(headers),
    data: status === 200 ? { result: { candles: [] } } : { error: { code: "rate-limit-exceeded" } },
  } as AxiosResponse;
}

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
