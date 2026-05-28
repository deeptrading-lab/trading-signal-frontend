/**
 * Vitest 단일 설정.
 *
 * PRD `stock-api-integration` AC-6, AC-10 — KIS 토큰 single-flight·캐시·갱신 + 종목명 매퍼 회귀 차단 단위 테스트의 1차 인프라.
 *
 * - `@/*` 경로 alias 는 `tsconfig.json` 의 `paths` 와 정합 (baseUrl=".") .
 * - 환경 = node — 본 PR-A 의 테스트는 모두 서버 측 모듈 (lib/api/kis, lib/api/dart, lib/query) 대상.
 *   추후 컴포넌트 단위 테스트 도입 시 `environment: "jsdom"` 분기 검토.
 * - `include` 는 `*.test.ts` glob 으로 한정. node_modules / .next 는 기본 제외.
 */

import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**", "Stock and Coin Analysis App/**"],
    globals: false,
    clearMocks: true,
  },
});
