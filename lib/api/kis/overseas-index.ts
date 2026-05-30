/**
 * KIS 해외 지수 기간별 시세(일봉) 호출.
 *
 * PRD `header-market-ticker` §3.1.
 *
 * ## 엔드포인트
 *
 * - 해외 지수: `GET /uapi/overseas-price/v1/quotations/inquire-daily-chartprice`
 *   - TR_ID = `FHKST03030100`
 *   - 쿼리: `FID_COND_MRKT_DIV_CODE=N`(해외지수), `FID_INPUT_ISCD=<SPX|COMP>`,
 *     `FID_INPUT_DATE_1`(시작 YYYYMMDD), `FID_INPUT_DATE_2`(종료 YYYYMMDD),
 *     `FID_PERIOD_DIV_CODE=D`(일봉)
 *   - 코드: `SPX`=S&P 500, `COMP`=NASDAQ 종합 (라이브 확정 SPX 7580.06 / COMP 26972.62)
 *
 * ## ⚠️ 날짜 필수 — 최신 영업일 종가 보장
 *
 * 본 엔드포인트는 날짜 범위가 필수다. 주말·휴장 대비로 시작일을 오늘-10일로 당겨
 * 최신 영업일 종가가 반드시 포함되게 한다(`buildDateRange`).
 *
 * ## ⚠️ output1(요약) → output2(시계열) 폴백
 *
 * 요약(`output1`)의 현재값이 0/빈값이면 `output2[0]`(최신 캔들 종가)로 폴백한다.
 *
 * ## ⚠️ 실전(prod) 전용
 *
 * 해외 지수도 prod 키 전제. BFF route 가 `isKisConfigured()` AND
 * `resolveKisEnv()==="prod"` 이중 게이트 통과 시에만 본 함수를 호출한다.
 *
 * 지수명은 응답 `hts_kor_isnm`(한글명) 표시 의존 금지 — `OVERSEAS_INDEX_NAME_BY_CODE`
 * 상수가 단일 진실 원천(stock-api-integration AC-10 정합).
 */

import { getKisClient } from "./client";
import { makeKisBusinessError, makeKisTransportError } from "./errors";
import { mapDirection, toNumber } from "./mappers";
import { getAccessToken } from "./token";
import {
  OVERSEAS_INDEX_NAME_BY_CODE,
  type KisOverseasDailyChartOutput1,
  type KisOverseasDailyChartResponse,
  type MarketIndexQuote,
} from "./types";

type AuthHeaders = {
  authorization: string;
  appkey: string;
  appsecret: string;
  tr_id: string;
  custtype: "P"; // P = 개인.
};

async function buildAuthHeaders(trId: string): Promise<AuthHeaders> {
  const accessToken = await getAccessToken();
  return {
    authorization: `Bearer ${accessToken}`,
    appkey: process.env.KIS_APP_KEY ?? "",
    appsecret: process.env.KIS_APP_SECRET ?? "",
    tr_id: trId,
    custtype: "P",
  };
}

/** YYYYMMDD 문자열 — KIS 날짜 파라미터 형식. */
function toYyyymmdd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * 호출 시점 기준 [오늘-lookbackDays, 오늘] 범위 생성.
 *
 * 주말/휴장 대비로 충분히 당겨(기본 10일) 최신 영업일 종가가 범위에 포함되게 한다.
 *
 * @param lookbackDays 시작일을 당길 일수(기본 10).
 * @param now 테스트 가능성을 위한 기준 시각(기본 현재).
 */
export function buildDateRange(
  lookbackDays = 10,
  now: Date = new Date(),
): { start: string; end: string } {
  const end = now;
  const start = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  return { start: toYyyymmdd(start), end: toYyyymmdd(end) };
}

/**
 * KIS `inquire-daily-chartprice` 응답 → 클라이언트 친화 `MarketIndexQuote`.
 *
 * - `output1`(요약) 의 현재값/등락을 1차로 쓰고, 현재값이 0/빈값이면 `output2[0]`
 *   (최신 캔들 종가)로 폴백한다.
 * - 지수명은 `OVERSEAS_INDEX_NAME_BY_CODE` 상수 매핑만 사용(응답 한글명 미사용).
 *
 * 단위 테스트 위치: `lib/api/kis/__tests__/overseas-index.mappers.test.ts`.
 */
export function mapOverseasIndex(
  response: Pick<KisOverseasDailyChartResponse, "output1" | "output2">,
  code: string,
): MarketIndexQuote {
  const summary: KisOverseasDailyChartOutput1 = response.output1 ?? {};
  const latestCandle = response.output2?.[0];

  // 요약 현재값이 비면 최신 캔들 종가로 폴백.
  const summaryValue = toNumber(summary.ovrs_nmix_prpr);
  const value =
    summaryValue !== 0 ? summaryValue : toNumber(latestCandle?.ovrs_nmix_prpr);

  return {
    code,
    name: OVERSEAS_INDEX_NAME_BY_CODE[code] ?? code,
    value,
    change: toNumber(summary.ovrs_nmix_prdy_vrss),
    changePercent: toNumber(summary.prdy_ctrt),
    direction: mapDirection(summary.prdy_vrss_sign),
    // 해외 지수 일봉 응답엔 누적 거래량 요약이 없어 0 으로 둔다(헤더 티커 미사용 필드).
    volume: 0,
  };
}

/**
 * 해외 지수 일봉 조회. KIS rt_cd != "0" 은 비즈니스 에러(한글 msg1 통과).
 *
 * @param code 해외 지수 코드 ("SPX"=S&P 500 / "COMP"=NASDAQ 종합).
 */
export async function fetchOverseasIndex(
  code: string,
): Promise<MarketIndexQuote> {
  const client = getKisClient();
  const headers = await buildAuthHeaders("FHKST03030100");
  const { start, end } = buildDateRange();

  let response;
  try {
    response = await client.get<KisOverseasDailyChartResponse>(
      "/uapi/overseas-price/v1/quotations/inquire-daily-chartprice",
      {
        headers,
        params: {
          FID_COND_MRKT_DIV_CODE: "N",
          FID_INPUT_ISCD: code,
          FID_INPUT_DATE_1: start,
          FID_INPUT_DATE_2: end,
          FID_PERIOD_DIV_CODE: "D",
        },
      },
    );
  } catch (error) {
    const status =
      typeof (error as { response?: { status?: number } }).response?.status ===
      "number"
        ? (error as { response: { status: number } }).response.status
        : undefined;
    throw makeKisTransportError({
      status,
      message:
        error instanceof Error
          ? error.message
          : "KIS 해외 지수 조회 중 네트워크 오류가 발생했어요.",
    });
  }

  const data = response.data;
  if (data.rt_cd !== "0") {
    throw makeKisBusinessError(data.msg1, data.msg_cd);
  }

  return mapOverseasIndex(data, code);
}
