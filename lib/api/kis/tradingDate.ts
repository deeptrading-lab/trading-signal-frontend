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
 */

import { fetchStockDaily } from "./price";

/** 영업일 기준 종목 — 거래정지 위험이 사실상 없는 대형주. */
const REFERENCE_TICKER = "005930"; // 삼성전자.

/**
 * 최신 영업일을 `YYYY-MM-DD` 로 돌려준다. 확보 실패 시 null.
 *
 * 응답 정렬(최신순/과거순)이 보장되지 않으므로 가장 큰 날짜를 고른다. `YYYY-MM-DD` 는 사전식 비교가
 * 곧 시간순 비교라 문자열 최댓값으로 충분하다.
 */
export async function fetchLatestTradingDate(): Promise<string | null> {
  try {
    const candles = await fetchStockDaily(REFERENCE_TICKER, "D");
    let latest: string | null = null;
    for (const candle of candles) {
      if (candle.date && (latest === null || candle.date > latest)) {
        latest = candle.date;
      }
    }
    return latest;
  } catch {
    return null;
  }
}
