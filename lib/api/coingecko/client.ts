/**
 * CoinGecko REST 호출용 axios 인스턴스.
 *
 * PRD `header-market-ticker` §3.2:
 *   - base URL: `https://api.coingecko.com/api/v3`
 *   - **단일 진입**: 모든 CoinGecko 호출이 본 인스턴스를 거친다. 직접 fetch 금지.
 *   - **timeout**: 5s (api-integration-dev 안정성 의무).
 *   - **Demo 키는 옵션**: env `COINGECKO_API_KEY` 가 설정돼 있으면 헤더
 *     `x_cg_demo_api_key` 부착, 없으면 무키 호출(라이브 동작 확인). BFF 긴 TTL 캐싱으로
 *     무료 한도(~10–30/min) 내 운영.
 *
 * 본 클라이언트는 **서버 측 only** — Next.js route handler 에서만 import.
 * 브라우저 코드가 직접 import 하면 Demo 키 누설 위험(env 설정 시). KIS 와 무관한 별도 도메인.
 */

import axios, { type AxiosInstance } from "axios";

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const DEFAULT_TIMEOUT_MS = 5_000;

/**
 * 본 인스턴스는 매 import 시 env 를 다시 읽지 않는다(모듈 cache).
 * 환경변수 변경 시 dev 서버 재시작 필요.
 */
let cachedClient: AxiosInstance | null = null;

export function getCoinGeckoClient(): AxiosInstance {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.COINGECKO_API_KEY?.trim();
  cachedClient = axios.create({
    baseURL: COINGECKO_BASE_URL,
    timeout: DEFAULT_TIMEOUT_MS,
    headers: {
      Accept: "application/json",
      // Demo 키 옵션 — 설정 시에만 헤더 부착. 미설정이면 무키 호출.
      ...(apiKey ? { x_cg_demo_api_key: apiKey } : {}),
    },
  });
  return cachedClient;
}

/**
 * 테스트 전용 — 인스턴스 캐시 초기화. 환경변수 변경 시 또는 mock 주입 시 사용.
 */
export function resetCoinGeckoClientForTest(): void {
  cachedClient = null;
}
