/**
 * 토스증권 REST 호출용 axios 인스턴스 + 공통 GET 헬퍼.
 *
 * PRD `toss-market-data-adapter` §3-1. `lib/api/kis/client.ts` 와 대칭:
 *   - **단일 진입**: 모든 토스 REST 호출이 `tossGet()` 을 거친다. 직접 fetch 금지.
 *   - **서버 측 only** — route handler·lib/server 에서만 import. 브라우저 import 금지(키 누설).
 *   - timeout 5s, 4xx 는 본문 통과(validateStatus < 500) 후 에러 envelope 분기.
 *
 * `tossGet()` 이 흡수하는 토스 특유 규약:
 *   - 성공 응답 `{ result }` 언래핑.
 *   - 401 invalid-token/expired-token → 단일 활성 토큰 정책상 외부 재발급으로 내 토큰이 죽은
 *     케이스 → 토큰 폐기 후 1회 재발급·재시도 (`token.ts` 주석 참조).
 *   - 429 → Retry-After를 공유. 캔들은 이후 호출부터 재개하고, 다른 경로는 3초 이내 최대 2회 재시도.
 */

import axios, { type AxiosInstance } from "axios";
import { makeTossBusinessError, makeTossTransportError } from "./errors";
import { getTossAccessToken, invalidateTossToken } from "./token";
import type { TossErrorBody } from "./types";
import { delay } from "@/lib/server/bffUtils";
import {
  PAPER_CANDLE_ADMISSION_BUDGET_MS,
  STOCK_CANDLE_ADMISSION_BUDGET_MS,
  observeCandleResponse,
  resetCandleRateLimitForTest,
  waitForCandleSlot,
} from "./candleRateLimit";

export const TOSS_BASE_URL = "https://openapi.tossinvest.com";
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_429_RETRIES = 2;
const RETRY_AFTER_CAP_SEC = 3;
const cooldowns = new Map<string, number>();
const nextDiagnostics = new Map<string, number>();

function diagnose(
  path: string, kind: string, status?: number, detail?: string, retryMs?: number,
  extra?: Record<string, unknown>,
) {
  const key = `${path}:${kind}:${status ?? ""}`;
  if (Date.now() < (nextDiagnostics.get(key) ?? 0)) return;
  nextDiagnostics.set(key, Date.now() + 30_000);
  console.warn(`[toss-rest] ${JSON.stringify({ at: new Date().toISOString(), path, kind, status, code: detail, retryMs, ...extra })}`);
}

function retryAfterMs(header: unknown) {
  const seconds = Number(header ?? 1);
  if (Number.isFinite(seconds)) return Math.max(200, seconds * 1_000);
  const date = typeof header === "string" ? Date.parse(header) : NaN;
  return Number.isFinite(date) ? Math.max(200, date - Date.now()) : 1_000;
}
/** 5xx/네트워크 transient 1회 재시도 — KIS `withPageRetry` 관례 답습(페이징 중 1회 실패로
 * 수집분 전체를 버리고 KIS 폴백 풀 페이징을 다시 도는 이중 비용 방지). */
const TRANSIENT_RETRY_BACKOFF_MS = 400;

let cachedClient: AxiosInstance | null = null;

export function getTossClient(): AxiosInstance {
  if (cachedClient) return cachedClient;
  cachedClient = axios.create({
    baseURL: TOSS_BASE_URL,
    timeout: DEFAULT_TIMEOUT_MS,
    validateStatus: (status) => status < 500,
  });
  return cachedClient;
}

/** 테스트 전용 — 인스턴스 캐시 초기화. */
export function resetTossClientForTest(): void {
  cachedClient = null;
  cooldowns.clear();
  nextDiagnostics.clear();
  resetCandleRateLimitForTest();
}

/**
 * 토스 환경변수(client_id/secret) 설정 여부 — 소스 토글(`resolveMarketDataSource`)의 게이트.
 * 미설정이면 토글값과 무관하게 KIS 경로 유지(PRD 목표 2 — 동료 로컬 무영향).
 */
export function isTossConfigured(): boolean {
  return Boolean(
    process.env.TOSS_CLIENT_ID?.trim() && process.env.TOSS_CLIENT_SECRET?.trim(),
  );
}

/**
 * 인증 GET + `{result}` 언래핑 + 401/429/transient 재시도.
 *
 * @param path `/api/v1/...` 경로.
 * @param params 쿼리 파라미터.
 */
export async function tossGet<T>(
  path: string,
  params?: Record<string, string | number>,
  source?: string,
): Promise<T> {
  const candle = path === "/api/v1/candles";
  const startedAt = Date.now();
  const admissionDeadline = startedAt + (source === "program-paper"
    ? PAPER_CANDLE_ADMISSION_BUDGET_MS
    : STOCK_CANDLE_ADMISSION_BUDGET_MS);
  let retried401 = false;
  let retries429 = 0;
  let retriedTransient = false;

  for (;;) {
    const waitMs = (cooldowns.get(path) ?? 0) - Date.now();
    if (waitMs > RETRY_AFTER_CAP_SEC * 1_000) throw makeTossBusinessError(429, undefined);
    if (waitMs > 0) await delay(waitMs);

    let token: string;
    try {
      token = await getTossAccessToken();
    } catch (error) {
      diagnose(path, "token", (error as { status?: number } | null)?.status);
      throw error;
    }

    let releaseCandleSlot: (() => void) | undefined;
    if (candle) {
      try {
        releaseCandleSlot = await waitForCandleSlot(admissionDeadline);
      } catch (error) {
        diagnose(path, "local-queue-timeout", 503, undefined, undefined, { source, interval: params?.interval });
        throw error;
      }
    }
    const sentAt = Date.now();
    let response;
    let candleRate: ReturnType<typeof observeCandleResponse> | undefined;
    try {
      try {
        response = await getTossClient().get(path, {
          params,
          signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
          headers: { Authorization: `Bearer ${token}` },
        });
        if (candle) candleRate = observeCandleResponse(response, sentAt);
      } finally {
        releaseCandleSlot?.();
      }
    } catch (error) {
      diagnose(path, "transport", axios.isAxiosError(error) ? error.response?.status : undefined,
        axios.isAxiosError(error) ? error.code : undefined);
      if (!retriedTransient) {
        retriedTransient = true;
        await delay(TRANSIENT_RETRY_BACKOFF_MS);
        continue;
      }
      const status =
        typeof (error as { response?: { status?: number } }).response?.status ===
        "number"
          ? (error as { response: { status: number } }).response.status
          : undefined;
      throw makeTossTransportError({
        status,
        message:
          error instanceof Error
            ? error.message
            : "토스증권 시세 조회 중 네트워크 오류가 발생했어요.",
      });
    }

    const candleDiagnostics = candleRate ? {
      source,
      interval: params?.interval,
      count: params?.count,
      queuedMs: sentAt - startedAt,
      retryAfterMs: candleRate.retryAfterMs,
      quota: candleRate.quota,
      remaining: candleRate.remaining,
      resetSeconds: candleRate.resetSeconds,
      intervalMs: candleRate.intervalMs,
    } : undefined;
    if (response.status === 200) {
      if (candleRate?.recovered) {
        diagnose(path, "rate-limit-recovered", 200, undefined, undefined, candleDiagnostics);
      }
      const body = response.data as { result?: T } | T;
      return body && typeof body === "object" && "result" in (body as object)
        ? ((body as { result?: T }).result as T)
        : (body as T);
    }

    const errBody = response.data as TossErrorBody;
    const code = errBody?.error?.code;

    if (
      response.status === 401 &&
      (code === "invalid-token" || code === "expired-token") &&
      !retried401
    ) {
      diagnose(path, "token-refresh", 401, code);
      retried401 = true;
      await invalidateTossToken(token);
      continue;
    }

    if (response.status === 429 && candleRate) {
      diagnose(path, "rate-limit", 429, code, candleRate.retryMs, {
        ...candleDiagnostics,
        requestId: errBody?.error?.requestId,
        referenceId: response.headers?.["referenceid"],
        cloudFrontId: response.headers?.["x-amz-cf-id"],
      });
    } else if (response.status === 429) {
      const waitMs = retryAfterMs(response.headers?.["retry-after"]);
      cooldowns.set(path, Math.max(Date.now() + waitMs, cooldowns.get(path) ?? 0));
      diagnose(path, "rate-limit", 429, code, waitMs);
      if (retries429 < MAX_429_RETRIES && waitMs <= RETRY_AFTER_CAP_SEC * 1_000) {
        retries429 += 1;
        continue;
      }
    } else {
      diagnose(path, "http", response.status, code);
    }

    throw makeTossBusinessError(response.status, errBody);
  }
}

/**
 * 배열 응답 방어 추출 — result 가 배열 그 자체 또는 `{ <key>: [...] }` 래핑 둘 다 흡수.
 * (스펙상 후자이지만 문서·실측 간 차이를 방어. 둘 다 아니면 빈 배열 — "아무 배열이나 첫 번째"
 * 같은 투기적 폴백은 두지 않는다: 응답에 다른 배열 필드가 추가되면 조용한 오염이 된다.)
 */
export function pickTossArray<T>(value: unknown, key: string): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const inner = (value as Record<string, unknown>)[key];
    if (Array.isArray(inner)) return inner as T[];
  }
  return [];
}
