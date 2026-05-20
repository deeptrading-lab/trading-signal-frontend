/**
 * 단일 axios 인스턴스.
 *
 * - PRD AC-3: 클라이언트 측 HTTP 호출은 모두 이 인스턴스를 거친다.
 *   FastAPI 직접 호출 금지 (route handler 경유). 따라서 `baseURL` 은 same-origin `/api`.
 * - PRD §6: timeout 은 기본 30초 이내.
 * - PRD §9 OPEN QUESTION 3: 응답 인터셉터에서 BE 응답을 `ApiError` 골격으로 매핑한다.
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
