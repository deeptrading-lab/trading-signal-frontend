/**
 * `lib/api/kis/search.ts` — getSymbolName 시드 역참조 회귀 테스트.
 *
 * UI 점검(2026-05-30) #2 — 디그레이드 행 종목명 fallback(추가 시점 store name 없을 때 보조).
 * 시드 수록 종목은 종목명을, 미수록 종목은 null 을 반환해야 한다.
 */

import { describe, it, expect } from "vitest";
import { getSymbolName, getMarketByTicker, getCorpCode, searchSymbols } from "@/lib/api/kis/search";
import { resolveBenchCode } from "@/lib/server/scorecard/relativeRunScoring";

describe("getSymbolName", () => {
  it("시드 수록 ticker 는 종목명 반환", () => {
    // 삼성전자는 시드(symbols.json) 대표주 — 검색 결과로 존재 확인 후 역참조 일치 검증.
    const samsung = searchSymbols("005930")[0];
    expect(samsung).toBeDefined();
    expect(getSymbolName("005930")).toBe(samsung!.name);
  });

  it("시드 미수록 ticker 는 null", () => {
    expect(getSymbolName("999999")).toBeNull();
  });
});

describe("getMarketByTicker — 오프라인 상장시장 역참조(scorecard-relative-scoring)", () => {
  it("KOSPI 대형주(삼성전자 005930) → KOSPI", () => {
    expect(getMarketByTicker("005930")).toBe("KOSPI");
  });
  it("시드 미수록 ticker → null", () => {
    expect(getMarketByTicker("999999")).toBeNull();
  });
});

describe("resolveBenchCode — 종목 → 벤치마크 지수 코드", () => {
  it("KOSPI 종목 → 0001", () => {
    expect(resolveBenchCode("005930")).toBe("0001");
  });
  it("시드 미수록 → 폴백 0001(KOSPI)", () => {
    expect(resolveBenchCode("999999")).toBe("0001");
  });
});

describe("searchSymbols — 띄어쓰기 무시 매칭", () => {
  it("중간 공백이 있어도 매칭 — '삼성 전자' → 삼성전자(005930)", () => {
    const r = searchSymbols("삼성 전자");
    expect(r.some((s) => s.ticker === "005930")).toBe(true);
  });
  it("공백 없는 입력도 동일 매칭 — '삼성전자'", () => {
    const r = searchSymbols("삼성전자");
    expect(r.some((s) => s.ticker === "005930")).toBe(true);
  });
  it("ticker 중간 공백도 제거 후 정확 매칭 — '005 930' → 005930 단건", () => {
    const r = searchSymbols("005 930");
    expect(r).toHaveLength(1);
    expect(r[0]!.ticker).toBe("005930");
  });
});

describe("searchSymbols — 미국 종목 통합 검색·랭킹(us-stock-support)", () => {
  it("정확 티커는 1위 — 'AAPL' → AAPL(NASDAQ) 최상단", () => {
    const r = searchSymbols("AAPL");
    expect(r[0]!.ticker).toBe("AAPL");
    expect(r[0]!.market).toBe("NASDAQ");
  });

  it("이름 접두는 유사 ETF 를 이긴다 — 'Apple' → AAPL 1위(2X Long Apple ETF 뒤로)", () => {
    const r = searchSymbols("Apple");
    expect(r[0]!.ticker).toBe("AAPL");
  });

  it("정확 티커 ETF 도 1위 — 'SPY' → SPY 최상단", () => {
    expect(searchSymbols("SPY")[0]!.ticker).toBe("SPY");
  });

  it("US 역참조: getSymbolName 은 미국 종목명, corp_code·getMarketByTicker 는 KR 전용이라 null", () => {
    expect(getSymbolName("AAPL")).toBe("Apple Inc.");
    expect(getCorpCode("AAPL")).toBeNull(); // 미국은 DART corp_code 없음.
    expect(getMarketByTicker("AAPL")).toBeNull(); // 스코어카드 벤치마크는 KR 전용 → US 는 null.
  });

  it("KR/US 격리 무회귀 — '삼성전자' 는 여전히 국내 005930", () => {
    expect(searchSymbols("삼성전자").some((s) => s.ticker === "005930")).toBe(true);
  });
});
