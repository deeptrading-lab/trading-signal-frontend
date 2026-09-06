/**
 * 최신 영업일(거래일) 조회 — 시세가 "언제의 숫자"인지 카드·캡션에 적기 위한 값.
 *
 * ## 왜 별도 조회가 필요한가
 * 업종 랭킹 TR(`FHPUP02140000`)의 `output1` 에는 지수·등락·상승/하락 종목수는 있어도 **영업일이 없다**.
 * 날짜처럼 보이는 `dryy_bstp_nmix_hgpr_date`·`dryy_bstp_nmix_lwpr_date` 는 연중 최고·최저를 찍은 날이지
 * 이 시세의 거래일이 아니다. 그래서 일자별 시세(`inquire-daily-price`, `stck_bsop_date` 포함)를
 * 한 번 더 불러 최신 영업일을 얻는다.
 *
 * ## 기준 종목
 * 지수 자체는 `fetchStockDaily`(FID_COND_MRKT_DIV_CODE="J", 주식)로 못 부른다. 거래정지가 사실상 없는
 * 대형주 하나의 최근 영업일이 곧 시장 영업일이므로 삼성전자를 기준으로 쓴다.
 *
 * ## fail-soft
 * 실패하면 null 을 돌려준다. 호출부(BFF)는 never-throw 원칙을 지켜야 하고, 거래일이 없다고 랭킹 자체를
 * 못 주는 편이 더 나쁘다. 소비자는 null 이면 날짜를 표기하지 않으면 된다.
 *
 * ## 하루 한 번만 부른다
 * 거래일은 하루에 한 번 바뀌는 값인데 랭킹 route 는 `no-store` 라 요청마다 새로 조회하게 된다.
 * 그 호출은 breadth fan-out(동시성 4로 억제 중)과 나란히 나가 EGW00201(초당 한도)을 압박한다.
 * 확보한 값을 TTL 동안 재사용해 호출을 한 번으로 줄인다.
 */

import { fetchStockDaily } from "./price";

/** 영업일 기준 종목 — 거래정지 위험이 사실상 없는 대형주. */
const REFERENCE_TICKER = "005930"; // 삼성전자.

/** 확보한 거래일 재사용 시간. 장중에도 영업일은 안 바뀌므로 넉넉히 잡는다. */
const CACHE_TTL_MS = 30 * 60 * 1000;

let cached: { value: string; at: number } | null = null;

/** `YYYY-MM-DD` 형식인지. `formatDate` 는 8자리가 아닌 원본을 그대로 통과시킨다. */
function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * 최신 영업일을 `YYYY-MM-DD` 로 돌려준다. 확보 실패 시 null.
 *
 * 응답 정렬(최신순/과거순)이 보장되지 않으므로 가장 큰 날짜를 고른다. `YYYY-MM-DD` 는 사전식 비교가
 * 곧 시간순 비교라 문자열 최댓값으로 충분하다.
 */
export async function fetchLatestTradingDate(
  nowMs: number = Date.now(),
): Promise<string | null> {
  if (cached && nowMs - cached.at < CACHE_TTL_MS) return cached.value;

  try {
    const candles = await fetchStockDaily(REFERENCE_TICKER, "D");
    let latest: string | null = null;
    for (const candle of candles) {
      // 형식과 체결 여부를 함께 본다. 개장 전 자리채움 행(종가·거래량 0)이나 형식이 깨진 날짜가
      // 사전식 최댓값을 차지하면, 이 필드가 막으려던 바로 그 잘못된 날짜가 나간다.
      if (!isIsoDate(candle.date) || !(candle.close > 0)) continue;
      if (latest === null || candle.date > latest) latest = candle.date;
    }
    if (latest) cached = { value: latest, at: nowMs };
    return latest;
  } catch {
    return null;
  }
}

/** 테스트에서 캐시를 비운다. */
export function resetTradingDateCache(): void {
  cached = null;
}
