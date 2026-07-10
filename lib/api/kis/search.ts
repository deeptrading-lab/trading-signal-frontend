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
import usSymbolsJson from "@/lib/api/marketdata/us-symbols.json";
import type { StockSearchMarket, StockSearchResult } from "./types";

type SymbolEntry = {
  ticker: string;
  name: string;
  market: StockSearchMarket;
  /** 국내만 보유(DART corp_code). 미국 종목은 없음. */
  corp_code?: string;
  /** 미국 시드만 보유 — ETF 여부(검색 랭킹에서 보통주 뒤로 미룸). */
  etf?: boolean;
};

/** 국내 시드(KRX KIND + OpenDART) — 6자리 티커·corp_code 보유. */
const KR_SYMBOLS: SymbolEntry[] = (symbolsJson.symbols ?? []) as SymbolEntry[];
/** 미국 시드(NASDAQ Trader) — 영문 티커·거래소, corp_code 없음(us-stock-support). */
const US_SYMBOLS: SymbolEntry[] = (usSymbolsJson.symbols ?? []) as SymbolEntry[];
/** 검색 통합 인덱스 — 국내 우선(빈 질의 대표주·모호 질의 상단). */
const SYMBOLS: SymbolEntry[] = [...KR_SYMBOLS, ...US_SYMBOLS];
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
  // 관련도 랭킹 — 미국 시드는 유사 이름 ETF(예: "2X Long Apple ETF")가 많아 단순 substring 이면
  // 정확 종목(AAPL·SPY)이 파묻힌다. 정확 티커 → 티커 접두 → 이름 접두 → 부분일치 순, ETF 후순위.
  const scored: { entry: SymbolEntry; score: number }[] = [];
  for (const s of SYMBOLS) {
    const ticker = s.ticker.toLowerCase();
    const name = s.name.toLowerCase().replace(/\s+/g, "");
    let score = -1;
    if (ticker === needle) score = 0;
    else if (ticker.startsWith(needle)) score = 1;
    else if (name.startsWith(needle)) score = 2;
    else if (ticker.includes(needle)) score = 4;
    else if (name.includes(needle)) score = 5;
    else continue;
    if (s.etf) score += 0.5; // 보통주 우선.
    scored.push({ entry: s, score });
  }
  scored.sort(
    (a, b) =>
      a.score - b.score ||
      a.entry.ticker.length - b.entry.ticker.length || // 짧은 티커 우선(태그성 ETF 밀어냄).
      a.entry.ticker.localeCompare(b.entry.ticker),
  );

  return scored.slice(0, MAX_RESULTS).map((x) => toResult(x.entry));
}

/**
 * ticker (6자리) → corp_code (8자리) 매핑.
 *
 * DART 호출 시 ticker 가 아닌 corp_code 가 필요. 미존재 ticker 는 null.
 */
export function getCorpCode(ticker: string): string | null {
  // corp_code 는 국내(DART) 전용 — 미국 종목은 항상 null.
  const found = KR_SYMBOLS.find((s) => s.ticker === ticker);
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
  // 벤치마크 지수 판정용 — 국내 시장만 의미(미국 종목은 null → 호출부 KR 폴백).
  const market = KR_SYMBOLS.find((s) => s.ticker === ticker)?.market;
  return market === "KOSPI" || market === "KOSDAQ" ? market : null;
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
