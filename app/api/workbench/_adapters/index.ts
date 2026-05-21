/**
 * Analyze adapter factory.
 *
 * `ANALYZE_BACKEND` 환경변수 값에 따라 `FastapiAdapter` 또는 `ClaudeCliAdapter` 를 반환한다.
 * 빈 값/오타는 `fastapi` 로 폴백 — 기존 동작 무회귀 보장.
 */

import { ClaudeCliAdapter } from "./claudeCli";
import { FastapiAdapter } from "./fastapi";
import type { AnalyzeAdapter, AnalyzeBackend } from "./types";

export function resolveBackend(): AnalyzeBackend {
  const raw = (process.env.ANALYZE_BACKEND ?? "").trim().toLowerCase();
  return raw === "claude-cli" ? "claude-cli" : "fastapi";
}

export function createAnalyzeAdapter(backend?: AnalyzeBackend): AnalyzeAdapter {
  const target = backend ?? resolveBackend();
  if (target === "claude-cli") {
    return new ClaudeCliAdapter();
  }
  return new FastapiAdapter();
}

export type { AnalyzeAdapter, AnalyzeBackend } from "./types";
