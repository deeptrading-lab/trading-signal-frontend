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
  // 띄어쓰기 무시 — 앞뒤·중간 공백을 모두 제거해 "삼성 전자"→"삼성전자", "005 930"→"005930" 으로 매칭.
  const compact = keyword.replace(/\s+/g, "");
  if (compact === "") {
    return SYMBOLS.slice(0, MAX_RESULTS).map(toResult);
  }

  // 6자리 숫자 → ticker 정확 매칭 우선.
  if (/^\d{6}$/.test(compact)) {
    const exact = SYMBOLS.find((s) => s.ticker === compact);
    return exact ? [toResult(exact)] : [];
  }

  const needle = compact.toLowerCase();
  const matched = SYMBOLS.filter((s) => {
    // 후보 종목명도 공백 제거해 비교(양쪽 정규화) — 시드에 공백 포함 이름이 있어도 매칭되게.
    return (
      s.name.toLowerCase().replace(/\s+/g, "").includes(needle) ||
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
 * ticker → 시드 종목명 역참조. 시드(symbols.json) 미수록이면 null.
 *
 * 디그레이드 행(시세 부분실패) 등 시세 응답 없이 종목명이 필요한 표시 경로의 fallback.
 * store 에 추가 시점 종목명이 없을 때만 보조로 쓴다(클라이언트 import 가능, 부수효과 0).
 */
export function getSymbolName(ticker: string): string | null {
  return SYMBOLS.find((s) => s.ticker === ticker)?.name ?? null;
}

/**
 * ticker → 상장시장("KOSPI" | "KOSDAQ") 역참조 — **오프라인 시드 기반**(추가 API 호출 없음).
 *
 * PRD `scorecard-relative-scoring` §벤치마크 해석. 채점 cron 이 종목→벤치마크 지수를 정할 때 쓴다.
 * `symbols.json` 미수록(신규 상장·시드 누락)이면 null → 호출부가 폴백 벤치마크(KOSPI)로 대체하고
 * 한계를 인지한다(PRD §6). search-stock-info(prod 전용 추가 호출) 의존을 피해 비용·rate-limit 절감.
 */
export function getMarketByTicker(ticker: string): "KOSPI" | "KOSDAQ" | null {
  return SYMBOLS.find((s) => s.ticker === ticker)?.market ?? null;
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
