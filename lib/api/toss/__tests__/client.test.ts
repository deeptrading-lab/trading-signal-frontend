import { AxiosHeaders, type AxiosResponse } from "axios";
import { afterEach, expect, it, vi } from "vitest";
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
