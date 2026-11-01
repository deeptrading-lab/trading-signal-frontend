/**
 * 스윙 규칙서 — PRD `swing-judgment` §3-1 의 단일 진실 원천(SSOT).
 *
 * 규칙은 사람이 정하고 판정은 코드가 한다. 여기 값이 판정의 전부다.
 *
 * ★값을 바꾸면 새 버전이다 — `version` 을 올리고 사전 등록·과거 통계(`stats-<version>.json`)를 새로 만든다.
 * 백테스트 결과를 보고 고치지 않는다(PRD §4). `stats-v1.json` 이 이 객체를 통째로 품고, 테스트가
 * 둘이 어긋나면 실패한다.
 *
 * 단위: 가격 = 원, 비율 = % (예: 20 = 20%), 수급 강도 = 하루 평균 거래대금 대비 배수.
 */

export type SwingMarket = "KOSPI" | "KOSDAQ";

export type Rulebook = {
  version: string;
  /** 판정에 쓰는 일봉 수 — 정확히 마지막 이만큼만 읽는다(창 불변성). */
  windowBars: number;
  /** 수급 창(ADV20·결측 판정). */
  flowWindowDays: number;
  liquidity: {
    minClose: number;
    /** 확정 유동성 — 수급 응답 거래대금(원) 20일 평균 하한. */
    minAdv20Won: number;
    /** 1차 거르기 — 종가×거래량 20일 평균(원) 하한. 이걸 통과한 종목만 수급을 조회한다. */
    prefilterAdv20Won: number;
  };
  /** 최근 이 봉 수 안에 거래량 0 이 있으면 거래정지로 본다. */
  haltLookbackBars: number;
  /** 종목명 제외 패턴(정규식 원문). */
  excludeNamePatterns: string[];
  atrPeriod: number;
  /** 시장별 고변동 경계 ATR14% — 발견 구간 유동 종목-일 분포의 67퍼센타일(수익률 보기 전 고정). */
  highVolAtrPct: Record<SwingMarket, number>;
  overheat: { r20Pct: number; rsi: number };
  dart: { lookbackBars: number; reportPattern: string };
  flow: {
    /** 수급 누적 일수 N. */
    days: number;
    /** A1~A3 문턱 — 하루 평균 거래대금 대비 배수 × N. */
    thresholdPerDay: number;
    /** 사모 순매수가 기관 순매수의 이 비율 이상이면 "사모 주도"로 A3 탈락. */
    peMaxShareOfInstitution: number;
    /** 연기금 가점 문턱(표시·정렬만). */
    pensionBonusPerDay: number;
  };
  stage: {
    bottomDev250Pct: number;
    bottomMinBarsSinceLow: number;
    boxBars: number;
    boxMaxPct: number;
    slopeBars: number;
  };
  momentum: { crossLookbackBars: number; rsiMin: number; rsiMax: number };
  doubleBottom: {
    swingWindow: number;
    secondMinAgo: number;
    secondMaxAgo: number;
    gapMin: number;
    gapMax: number;
    maxDiffAtr: number;
    minBounceAtr: number;
  };
  plan: {
    zoneMinWeightPct: number;
    stopBufferAtr: number;
    fallbackStopAtr: number;
    maxStopAtr: number;
    minStopAtr: number;
    targetCapTypicalMult: number;
    minTargetGapPct: number;
    minRr: number;
  };
};

export const RULEBOOK: Rulebook = {
  version: "swing-v1",
  windowBars: 300,
  flowWindowDays: 20,
  liquidity: { minClose: 1_000, minAdv20Won: 3_000_000_000, prefilterAdv20Won: 2_000_000_000 },
  haltLookbackBars: 5,
  excludeNamePatterns: ["스팩", "리츠$"],
  atrPeriod: 14,
  // 발견 구간(2024–2025) 유니버스 종목-일 ATR14% 67퍼센타일, 0.01 반올림 — 수익률 미사용 분포로 확정
  // (KOSPI 123,104 · KOSDAQ 160,082 종목-일, `audit.mts dist atr`, 사전 등록 §0-1).
  highVolAtrPct: { KOSPI: 4.97, KOSDAQ: 7.32 },
  overheat: { r20Pct: 20, rsi: 75 },
  dart: {
    lookbackBars: 20,
    reportPattern:
      "유상증자결정|유무상증자결정|전환사채권발행결정|신주인수권부사채권발행결정|교환사채권발행결정|감자결정|회생절차개시신청|부도발생|영업정지",
  },
  flow: { days: 5, thresholdPerDay: 0.02, peMaxShareOfInstitution: 0.5, pensionBonusPerDay: 0.004 },
  stage: { bottomDev250Pct: -15, bottomMinBarsSinceLow: 10, boxBars: 60, boxMaxPct: 25, slopeBars: 20 },
  momentum: { crossLookbackBars: 5, rsiMin: 45, rsiMax: 70 },
  doubleBottom: {
    swingWindow: 3,
    secondMinAgo: 3,
    secondMaxAgo: 10,
    gapMin: 10,
    gapMax: 60,
    maxDiffAtr: 1,
    minBounceAtr: 2,
  },
  plan: {
    zoneMinWeightPct: 6,
    stopBufferAtr: 0.5,
    fallbackStopAtr: 2,
    maxStopAtr: 3,
    minStopAtr: 1,
    targetCapTypicalMult: 2,
    minTargetGapPct: 0.5,
    minRr: 1.5,
  },
};
