/**
 * 단일 axios 인스턴스.
 *
 * - PRD AC-3: 클라이언트 측 HTTP 호출은 모두 이 인스턴스를 거친다.
 *   FastAPI 직접 호출 금지 (route handler 경유). 따라서 `baseURL` 은 same-origin `/api`.
 * - PRD §6: timeout 은 기본 30초 이내.
 * - PRD §9 OPEN QUESTION 3: 응답 인터셉터에서 BE 응답을 `ApiError` 골격으로 매핑한다.
 * - PRD `app-password-gate` §3.6 / AC-20: 게이트 401(`/api/*`) 수신 시 `/login` 으로 유도
 *   (세션 만료 graceful). 인증 API(`/api/auth/*`)·이미 `/login` 인 경우는 제외(무한 루프 가드).
 */

import axios, { AxiosError, type AxiosInstance } from "axios";
import { makeApiError, type ApiError } from "@/lib/api/errors";

const DEFAULT_TIMEOUT_MS = 30_000;

export const httpClient: AxiosInstance = axios.create({
  baseURL: "/api",
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * 응답 인터셉터 — axios 에러를 통합 `ApiError` 로 매핑.
 *
 * BE 시그니처:
 *   422 Pydantic → { detail: [...] }            → kind: "validation"
 *   400 whitelist miss → { detail: "..." }       → kind: "whitelist_miss"
 *   기타 5xx 또는 비정상                          → kind: "server"
 *   네트워크 단절·타임아웃 (response 없음)        → kind: "network"
 *
 * route handler 가 한글 폴백 메시지로 덮어쓴 경우 그 본문을 우선 사용한다.
 */
httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const apiError = mapAxiosError(error);
    return Promise.reject(apiError);
  },
);

function mapAxiosError(error: AxiosError): ApiError {
  // 네트워크 단절 또는 타임아웃 — response 자체가 없다.
  if (!error.response) {
    if (error.code === "ECONNABORTED") {
      return makeApiError("network", {
        message: "엔진 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.",
      });
    }
    return makeApiError("network");
  }

  const status = error.response.status;
  const data = error.response.data;
  const bodyMessage = extractMessage(data);

  if (status === 401) {
    // 게이트 미인증/세션 만료 — 브라우저면 `/login` 으로 유도(데이터 카드가 무한 에러로 남지 않게).
    redirectToLogin(error);
    return makeApiError("unauthorized", { status, detail: data });
  }

  if (status === 422) {
    return makeApiError("validation", {
      status,
      message: bodyMessage ?? undefined,
      detail: data,
    });
  }

  if (status === 400 && isWhitelistMissMessage(bodyMessage)) {
    return makeApiError("whitelist_miss", {
      status,
      message: bodyMessage ?? undefined,
      detail: data,
    });
  }

  if (status >= 500) {
    return makeApiError("server", {
      status,
      message: bodyMessage ?? undefined,
      detail: data,
    });
  }

  // 그 외 4xx — 일반 server 분류로 떨어뜨린다. 후속 PRD 에서 세분화 가능.
  return makeApiError("server", {
    status,
    message: bodyMessage ?? undefined,
    detail: data,
  });
}

function extractMessage(data: unknown): string | null {
  if (typeof data === "string" && data.trim() !== "") return data;
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.error === "string") return record.error;
    if (typeof record.detail === "string") return record.detail;
    if (Array.isArray(record.detail) && record.detail.length > 0) {
      // Pydantic 422 detail[0].msg 를 대표 메시지로 표면화.
      const first = record.detail[0] as Record<string, unknown> | undefined;
      if (first && typeof first.msg === "string") return first.msg;
    }
    if (typeof record.message === "string") return record.message;
  }
  return null;
}

function isWhitelistMissMessage(message: string | null): boolean {
  if (!message) return false;
  return /화이트리스트/.test(message);
}

/**
 * 게이트 401 → `/login` 유도 (PRD app-password-gate §3.6 / AC-20).
 *
 * 무한 루프 가드:
 *   (a) 브라우저 환경에서만 (`typeof window` — SSR/RSC 경로에서 window 접근 금지).
 *   (b) 인증 API(`/api/auth/*`) 호출의 401 은 제외 (로그인 실패 401 이 리다이렉트로 오인되지 않게).
 *   (c) 이미 `/login` 이면 제외 (`/login` → `/login` 루프 차단).
 * `/login?next=<현재경로>` 로 이동해 로그인 후 복귀(같은 origin 절대경로).
 */
function redirectToLogin(error: AxiosError): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/login") return;

  const requestUrl = error.config?.url ?? "";
  // axios baseURL 은 `/api` — 인증 API 는 `/auth/login`·`/auth/logout` 로 들어온다.
  if (requestUrl.includes("/auth/login") || requestUrl.includes("/auth/logout")) {
    return;
  }

  const next = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
}
