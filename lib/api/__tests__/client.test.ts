/**
 * `lib/api/client.ts` 응답 인터셉터 401 매핑 테스트.
 *
 * PRD `app-password-gate` AC-20:
 *   - `/api/*` 401 수신 → `ApiError(kind="unauthorized")` 로 매핑.
 *   - SSR/node 환경(`window` 없음)에서 리다이렉트 시도가 예외를 던지지 않는다(가드).
 *   - 인증 API(`/auth/login`) 401 은 매핑은 하되 리다이렉트 가드로 걸러진다(node 환경에선 영향 0).
 *
 * 인터셉터를 직접 호출하기 어려우므로 axios mock-adapter 대신
 * 인터셉터에 등록된 reject 핸들러를 끄집어내 단위 검증한다.
 */

import { describe, it, expect } from "vitest";
import type { AxiosError } from "axios";
import { httpClient } from "../client";
import { isApiError } from "../errors";

/** 등록된 응답 인터셉터의 rejected 핸들러를 추출. */
function getRejectHandler(): (error: AxiosError) => Promise<never> {
  const handlers = (
    httpClient.interceptors.response as unknown as {
      handlers: Array<{
        rejected?: (error: AxiosError) => Promise<never>;
      }>;
    }
  ).handlers;
  const handler = handlers.find((h) => typeof h.rejected === "function");
  if (!handler?.rejected) throw new Error("rejected handler not found");
  return handler.rejected;
}

function makeAxiosError(status: number, url: string): AxiosError {
  return {
    isAxiosError: true,
    name: "AxiosError",
    message: `Request failed with status code ${status}`,
    config: { url },
    response: {
      status,
      data: { error: "unauthorized" },
      statusText: "",
      headers: {},
      config: { url } as never,
    },
  } as unknown as AxiosError;
}

describe("httpClient 401 매핑 (app-password-gate AC-20)", () => {
  it("[AC-20] /api/* 401 → ApiError(kind=unauthorized)", async () => {
    const reject = getRejectHandler();
    await expect(reject(makeAxiosError(401, "/market/ticker"))).rejects.toSatisfy(
      (err: unknown) => isApiError(err) && err.kind === "unauthorized",
    );
  });

  it("node 환경(window 없음) — 리다이렉트 가드로 예외 없이 reject", async () => {
    const reject = getRejectHandler();
    // window 미정의 환경에서 redirectToLogin 이 조용히 no-op.
    await expect(reject(makeAxiosError(401, "/auth/login"))).rejects.toSatisfy(
      (err: unknown) => isApiError(err) && err.kind === "unauthorized",
    );
  });

  it("401 이 아닌 5xx 는 server 로 매핑(회귀 0)", async () => {
    const reject = getRejectHandler();
    await expect(reject(makeAxiosError(500, "/market/ticker"))).rejects.toSatisfy(
      (err: unknown) => isApiError(err) && err.kind === "server",
    );
  });
});
