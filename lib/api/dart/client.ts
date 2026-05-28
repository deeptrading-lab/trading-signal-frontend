/**
 * OpenDART REST 호출용 axios 인스턴스.
 *
 * PRD `stock-api-integration` §3.2, api-integration-dev 안정성 의무:
 *   - **base URL**: `https://opendart.fss.or.kr/api`.
 *   - **timeout**: 3s (DART 평균 응답이 KIS 보다 느린 편이나, 본 PR-A 의 책임 경계는 3s 컷오프).
 *   - **인증**: `crtfc_key` (API 키) 를 query param 으로 매번 전송 — 본 클라이언트는 default params 에 박지 않고
 *     각 호출 함수가 명시 전달 (재사용 캐싱 / 다중 키 지원 여지).
 *
 * 본 클라이언트는 **서버 측 only** — Next.js route handler (`app/api/disclosure/*`) 에서만 import.
 * 브라우저 코드가 직접 import 하면 OpenDART API Key 누설 위험.
 */

import axios, { type AxiosInstance } from "axios";

const DART_BASE_URL = "https://opendart.fss.or.kr/api";
const DEFAULT_TIMEOUT_MS = 3_000;

let cachedClient: AxiosInstance | null = null;

export function getDartClient(): AxiosInstance {
  if (cachedClient) return cachedClient;
  cachedClient = axios.create({
    baseURL: DART_BASE_URL,
    timeout: DEFAULT_TIMEOUT_MS,
    headers: {
      Accept: "application/json",
    },
    // DART 는 200 응답 안에 status="013" 등 비즈니스 에러를 담는다. 4xx 도 axios 에러 우회.
    validateStatus: (status) => status < 500,
  });
  return cachedClient;
}

export function resetDartClientForTest(): void {
  cachedClient = null;
}

/**
 * OpenDART API 키 가져오기. 미설정 시 빈 문자열.
 *
 * BFF route handler 는 `isDartConfigured()` 로 분기 후 본 함수의 결과를 query param 으로 전달.
 */
export function getDartApiKey(): string {
  return process.env.OPENDART_API_KEY?.trim() ?? "";
}

/**
 * DART 환경변수가 설정됐는지 확인 — BFF route handler 가 mock fallback 분기에 사용.
 */
export function isDartConfigured(): boolean {
  return Boolean(getDartApiKey());
}
