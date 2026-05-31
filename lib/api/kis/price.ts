/**
 * KIS 국내주식 현재가 + 일자별 시세 호출.
 *
 * PRD `stock-api-integration` §3.1.
 *
 * ## 엔드포인트
 *
 * - 현재가: `GET /uapi/domestic-stock/v1/quotations/inquire-price`
 *   - TR_ID = `FHKST01010100`
 *   - 쿼리: `FID_COND_MRKT_DIV_CODE=J` (J=주식), `FID_INPUT_ISCD=<ticker>`
 *
 * - 일자별: `GET /uapi/domestic-stock/v1/quotations/inquire-daily-price`
 *   - TR_ID = `FHKST01010400`
 *   - 쿼리: `FID_COND_MRKT_DIV_CODE=J`, `FID_INPUT_ISCD=<ticker>`,
 *           `FID_PERIOD_DIV_CODE=D|W|M`, `FID_ORG_ADJ_PRC=0` (수정주가)
 *
 * 본 모듈은 호출만 담당 — 응답 매핑은 `mappers.ts`, BFF route handler 가 결과 통과.
 */

import { getKisClient } from "./client";
import { makeKisBusinessError, makeKisTransportError } from "./errors";
import { getAccessToken } from "./token";
import type {
  KisEnvelope,
  KisInquireDailyPriceItem,
  KisInquirePriceOutput,
} from "./types";
import { mapDailyCandle, mapStockPrice } from "./mappers";
import type { StockDailyCandle, StockPrice } from "./types";

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

/**
 * 현재가 조회. KIS rt_cd != "0" 은 비즈니스 에러 (한글 msg1 통과).
 */
export async function fetchStockPrice(ticker: string): Promise<StockPrice> {
  const client = getKisClient();
  const headers = await buildAuthHeaders("FHKST01010100");

  let response;
  try {
    response = await client.get<KisEnvelope<KisInquirePriceOutput>>(
      "/uapi/domestic-stock/v1/quotations/inquire-price",
      {
        headers,
        params: {
          FID_COND_MRKT_DIV_CODE: "J",
          FID_INPUT_ISCD: ticker,
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
          : "KIS 시세 조회 중 네트워크 오류가 발생했어요.",
    });
  }

  const data = response.data;
  if (data.rt_cd !== "0" || !data.output) {
    throw makeKisBusinessError(data.msg1, data.msg_cd);
  }

  return mapStockPrice(data.output, ticker);
}

/**
 * 일자별 시세 조회. period = "D" / "W" / "M".
 */
export async function fetchStockDaily(
  ticker: string,
  period: "D" | "W" | "M" = "D",
): Promise<StockDailyCandle[]> {
  const client = getKisClient();
  const headers = await buildAuthHeaders("FHKST01010400");

  let response;
  try {
    response = await client.get<KisEnvelope<KisInquireDailyPriceItem[]>>(
      "/uapi/domestic-stock/v1/quotations/inquire-daily-price",
      {
        headers,
        params: {
          FID_COND_MRKT_DIV_CODE: "J",
          FID_INPUT_ISCD: ticker,
          FID_PERIOD_DIV_CODE: period,
          FID_ORG_ADJ_PRC: "0",
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
          : "KIS 일자별 시세 조회 중 네트워크 오류가 발생했어요.",
    });
  }

  const data = response.data;
  if (data.rt_cd !== "0" || !data.output) {
    throw makeKisBusinessError(data.msg1, data.msg_cd);
  }

  return data.output.map(mapDailyCandle);
}

/**
 * 기간별 차트 시세 조회 — `inquire-daily-itemchartprice` (TR_ID `FHKST03010100`).
 *
 * `inquire-daily-price`(최근 30건)와 달리 날짜 범위 지정으로 **최대 100건** 조회 가능.
 * MACD(26+9) 등 보조지표 계산에 충분한 봉을 확보하기 위해 사용한다.
 *
 * @param ticker 종목코드 6자리.
 * @param fromDate 조회 시작일자 YYYYMMDD.
 * @param toDate   조회 종료일자 YYYYMMDD.
 */
export async function fetchStockDailyChart(
  ticker: string,
  fromDate: string,
  toDate: string,
  period: "D" | "W" | "M" = "D",
): Promise<StockDailyCandle[]> {
  const client = getKisClient();
  const headers = await buildAuthHeaders("FHKST03010100");

  type ItemChartResponse = {
    rt_cd: string;
    msg_cd: string;
    msg1: string;
    output1: Record<string, unknown>;
    output2: KisInquireDailyPriceItem[];
  };

  let response;
  try {
    response = await client.get<ItemChartResponse>(
      "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice",
      {
        headers,
        params: {
          FID_COND_MRKT_DIV_CODE: "J",
          FID_INPUT_ISCD: ticker,
          FID_INPUT_DATE_1: fromDate,
          FID_INPUT_DATE_2: toDate,
          FID_PERIOD_DIV_CODE: period,
          FID_ORG_ADJ_PRC: "0",
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
          : "KIS 차트 시세 조회 중 네트워크 오류가 발생했어요.",
    });
  }

  const data = response.data;
  if (data.rt_cd !== "0") {
    throw makeKisBusinessError(data.msg1, data.msg_cd);
  }

  return (data.output2 ?? []).map(mapDailyCandle);
}
