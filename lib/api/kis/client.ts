/**
 * KIS REST 호출용 axios 인스턴스.
 *
 * PRD `stock-api-integration` §3.1, §3.7, §7 사전 검증 메모 (2026-05-28):
 *   - **모의 도메인 포트 명시**: `openapivts.koreainvestment.com:29443`. 포트 누락 시 connection refused.
 *   - **실전 도메인**: `openapi.koreainvestment.com:9443`. 본 PRD 권장 X (실전계좌 안전장치).
 *   - **단일 진입**: 모든 KIS REST 호출이 본 인스턴스를 거친다. 직접 fetch 금지.
 *   - **timeout**: 5s (api-integration-dev 안정성 의무).
 *
 * 본 클라이언트는 **서버 측 only** — Next.js route handler (`app/api/stock/*`) 에서만 import.
 * 브라우저 코드가 직접 import 하면 KIS App Key / Secret 누설 위험. ESLint 가 잡지 못해 reviewer 가 검토.
 */

import axios, { type AxiosInstance } from "axios";

export type KisEnv = "vts" | "prod";

const KIS_BASE_URL_BY_ENV: Record<KisEnv, string> = {
  vts: "https://openapivts.koreainvestment.com:29443",
  prod: "https://openapi.koreainvestment.com:9443",
};

const DEFAULT_TIMEOUT_MS = 5_000;

/**
 * 환경변수 `KIS_ENV` 에서 모드를 읽어 base URL 을 결정.
 * 미설정 또는 비정상 값 → "vts" fallback (모의 환경 default).
 */
export function resolveKisEnv(): KisEnv {
  const value = process.env.KIS_ENV;
  if (value === "prod") return "prod";
  return "vts";
}

export function resolveKisBaseUrl(env: KisEnv = resolveKisEnv()): string {
  return KIS_BASE_URL_BY_ENV[env];
}

/**
 * 본 인스턴스는 매 import 시 base URL 을 환경변수에서 다시 읽지 않는다 (모듈 cache).
 * 환경변수 변경 시 dev 서버 재시작 필요.
 */
let cachedClient: AxiosInstance | null = null;

export function getKisClient(): AxiosInstance {
  if (cachedClient) return cachedClient;
  cachedClient = axios.create({
    baseURL: resolveKisBaseUrl(),
    timeout: DEFAULT_TIMEOUT_MS,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    // KIS 는 4xx 응답을 axios 에러로 받지 않고 본문 통과하는 편이 유리하다 — rt_cd 분기는
    // 호출 측에서 처리. 단 5xx 는 axios 에러로 그대로 throw 시킴.
    validateStatus: (status) => status < 500,
  });
  return cachedClient;
}

/**
 * 테스트 전용 — 인스턴스 캐시 초기화. 환경변수 변경 시 또는 mock 주입 시 사용.
 */
export function resetKisClientForTest(): void {
  cachedClient = null;
}

/**
 * KIS 환경변수가 모두 설정됐는지 확인 — BFF route handler 가 mock fallback 분기에 사용.
 *
 * 6개 변수 중 핵심 2개 (App Key + App Secret) 만 검사. 계좌 관련 변수는 본 PR-A 범위 밖 (조회 only).
 */
export function isKisConfigured(): boolean {
  return Boolean(
    process.env.KIS_APP_KEY?.trim() && process.env.KIS_APP_SECRET?.trim(),
  );
}
