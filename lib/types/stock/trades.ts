/**
 * 종목 체결(체결강도 + 체결 테이프) — `/api/stock/trades` BFF 앱 표준 타입.
 *
 * PRD `toss-trades` §3-3. 원천은 토스 `GET /api/v1/trades`(최근 체결 배열).
 * 토스 원본 문자열 스키마(`TossTrade`, `lib/api/toss/types.ts`)를 어댑터가 숫자로 파싱·정규화한
 * 뒤, 순수 틱룰(`lib/api/toss/tradeStrength.ts`)이 방향을 파생한 결과가 이 타입이다.
 * 화면(`TradeStrengthPanel`)은 이 표준 형태만 소비한다.
 *
 * ## ★ 결정적 한계 — side 필드 부재 → 강도는 "추정치"
 *
 * 토스 체결 응답에는 매수/매도 방향(side) 필드가 없다(§6 AC-0 실측 확정). 체결강도는 틱룰
 * (Lee-Ready 간이: 상승틱=매수·하락틱=매도·동일가=상속)로 **파생**한 근사치다. `TradeStrength`
 * 는 `method:"tick-rule"`·`isApproximation:true` 표식을 반드시 포함해 소비처가 강도를 정밀
 * 수급으로 오용하지 못하게 코드 레벨에서 잠근다(PRD §9 q1).
 */

/** 틱룰 파생 방향 분류(근사). neutral = seed 불명 첫 체결 / 전부 동일가 스트림. */
export type TradeSide = "buy" | "sell" | "neutral";

/**
 * 정규화된 체결 1건 — 순수 틱룰 함수의 **입력**(방향 없음). price·volume 은 토스 원본 문자열을
 * `Number` 파싱한 유한값, timestamp 는 원본 ISO(+09:00) 유지.
 */
export type Trade = {
  /** 체결가(원). */
  price: number;
  /** 체결량(주). */
  volume: number;
  /** 체결 시각(ISO 8601 +09:00, 원본 유지). */
  timestamp: string;
};

/**
 * 테이프 표시용 체결 — `Trade` 에 틱룰 파생 `side` 를 부착한 형태(순수 함수의 **출력**).
 * 테이프 행 색칠(상승틱=빨강·하락틱=파랑·동일가=상속색·seed=중립)이 이 side 를 그대로 쓴다.
 */
export type TapeTrade = Trade & { side: TradeSide };

/**
 * 틱룰 파생 체결강도(근사) — 매수 vs 매도 체결량 비중.
 *   - `strength = buyVolume / (buyVolume + sellVolume)` (0~1, 1=매수 우위).
 *   - 분모 0(빈 체결·전부 동일가·seed만) → `strength = null`(불명).
 *   - `method`·`isApproximation` = 파생 방식·근사 표식(오용 잠금, PRD §9 q1).
 */
export type TradeStrength = {
  /** 매수(상승틱) 체결량 합. */
  buyVolume: number;
  /** 매도(하락틱) 체결량 합. */
  sellVolume: number;
  /** 매수 우위 비율(0~1). 분모 0/불명 → null. */
  strength: number | null;
  /** 파생 방식 표식 — 근사임을 코드 레벨에 명시. */
  method: "tick-rule";
  /** 정밀 수급이 아니라 틱룰 추정치임을 명시(오용 차단). */
  isApproximation: true;
  /** 강도 산출에 쓰인 체결 수(buy+sell, neutral 제외). */
  sampleCount: number;
};

/** 체결 조회 결과 — BFF 응답 본문 그 자체(envelope 없음). */
export type TradesResult = {
  /** 표시용 체결 목록 — 최신순(방어정렬 후), 각 side 부착. */
  trades: TapeTrade[];
  /** 틱룰 파생 체결강도(근사). */
  strength: TradeStrength;
  /** 유효 체결 0 = 빈 체결(장 마감/미지원). */
  isEmpty: boolean;
  /** 가장 최근 체결 시각(ISO 8601 +09:00). 빈 체결이면 null. */
  updatedAt: string | null;
};

/** 빈 강도 — 분모 0(빈 체결·키 없음·실패) 기본값. */
export const EMPTY_TRADE_STRENGTH: TradeStrength = {
  buyVolume: 0,
  sellVolume: 0,
  strength: null,
  method: "tick-rule",
  isApproximation: true,
  sampleCount: 0,
};

/** 빈 체결(키 없음·실패·장 마감) — never-throw 디그레이드 기본값. */
export const EMPTY_TRADES_RESULT: TradesResult = {
  trades: [],
  strength: EMPTY_TRADE_STRENGTH,
  isEmpty: true,
  updatedAt: null,
};
