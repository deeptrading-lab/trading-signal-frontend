/**
 * 종목 검색 — 본 PR-A 는 `symbols.json` 시드 기반 substring fuzzy 검색.
 *
 * PRD `stock-api-integration` §9 q3 / q7 [RESOLVED]:
 *   - q3: 수동 시드 350개 (KOSPI 대형주 + KOSDAQ 대형주). 본 PR-A 의 시드는 ~100개.
 *   - q7: KIS 종목 검색 API 확인은 후속. 본 PR-A 는 (b) symbols.json substring 채택.
 *
 * ## 검색 정책
 *
 * - 입력 keyword 가 빈 문자열 → 시드 상위 20개 반환 (대표주).
 * - keyword 가 6자리 숫자 → ticker 정확 매칭 우선.
 * - 한글 / 영문 부분 일치 → name·ticker substring 검색 (대소문자 무관).
 * - 최대 결과 = 20개 (UX, 후속 확장 가능).
 *
 * 후속 PR (Fuse.js 또는 KIS 검색 API) 진입 시 본 함수 시그니처 유지하면서 내부 구현만 교체.
 */

import symbolsJson from "./symbols.json";
import type { StockSearchResult } from "./types";

type SymbolEntry = {
  ticker: string;
  name: string;
  market: "KOSPI" | "KOSDAQ";
  corp_code: string;
};

const SYMBOLS: SymbolEntry[] = (symbolsJson.symbols ?? []) as SymbolEntry[];
const MAX_RESULTS = 20;

/**
 * symbols.json 시드에서 fuzzy 검색.
 *
 * 시드 누락 종목은 결과에 포함되지 않음 — UX 측에서 안내 메시지 제공.
 */
export function searchSymbols(keyword: string): StockSearchResult[] {
  const trimmed = keyword.trim();
  if (trimmed === "") {
    return SYMBOLS.slice(0, MAX_RESULTS).map(toResult);
  }

  // 6자리 숫자 → ticker 정확 매칭 우선.
  if (/^\d{6}$/.test(trimmed)) {
    const exact = SYMBOLS.find((s) => s.ticker === trimmed);
    return exact ? [toResult(exact)] : [];
  }

  const needle = trimmed.toLowerCase();
  const matched = SYMBOLS.filter((s) => {
    return (
      s.name.toLowerCase().includes(needle) ||
      s.ticker.toLowerCase().includes(needle)
    );
  });

  return matched.slice(0, MAX_RESULTS).map(toResult);
}

/**
 * ticker (6자리) → corp_code (8자리) 매핑.
 *
 * DART 호출 시 ticker 가 아닌 corp_code 가 필요. 미존재 ticker 는 null.
 */
export function getCorpCode(ticker: string): string | null {
  const found = SYMBOLS.find((s) => s.ticker === ticker);
  return found?.corp_code ?? null;
}

/**
 * 시드 메타 — BFF route handler 가 응답 헤더 (`X-Symbols-Source: seed-v0.1.0`) 에 표기.
 */
export function getSymbolsMeta(): {
  version: string;
  count: number;
} {
  const meta = (symbolsJson.$meta ?? {}) as {
    version?: string;
    count_actual?: number;
  };
  return {
    version: meta.version ?? "unknown",
    count: meta.count_actual ?? SYMBOLS.length,
  };
}

function toResult(entry: SymbolEntry): StockSearchResult {
  return {
    ticker: entry.ticker,
    name: entry.name,
    market: entry.market,
  };
}
