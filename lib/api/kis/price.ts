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
  KisInquireTimeItemChartItem,
} from "./types";
import { mapDailyCandle, mapMinuteCandle, mapStockPrice, toNumber } from "./mappers";
import type {
  StockDailyCandle,
  StockMinuteCandle,
  StockPrice,
  StockPriceWithShares,
} from "./types";
import { withTossFallback } from "@/lib/api/marketdata/source";
import {
  fetchStockPriceToss,
  fetchStockPriceWithSharesToss,
} from "@/lib/api/toss/price";
import {
  fetchStockDailyChartToss,
  fetchStockDailyToss,
} from "@/lib/api/toss/candles";

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
 *
 * `MARKET_DATA_SOURCE=toss`(+키 존재) 시 토스 어댑터로 위임 — 실패하면 KIS 폴백
 * (PRD `toss-market-data-adapter` §3-2·3-3. 이하 fetch* 동일 패턴).
 */
export async function fetchStockPrice(ticker: string): Promise<StockPrice> {
  return withTossFallback(
    "현재가",
    () => fetchStockPriceToss(ticker),
    () => fetchStockPriceKis(ticker),
  );
}

async function fetchStockPriceKis(ticker: string): Promise<StockPrice> {
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

/** 현재가 + 상장주수 반환형 — 정의는 types.ts (kis↔toss 순환 방지). 기존 import 경로 호환 re-export. */
export type { StockPriceWithShares };

/**
 * 현재가 조회 + 상장주수 동시 반환.
 *
 * `fetchStockPrice` 는 클라이언트 친화 `StockPrice`(시총용 `lstn_stcn` 미보존)만 돌려준다.
 * 스냅샷(`/api/stock/snapshot`)은 `marketCapKRW = current × lstn_stcn` 산출에 상장주수가 필요해
 * 같은 inquire-price 호출에서 raw `lstn_stcn` 을 함께 추출한다(중복 호출 회피). 매핑·에러 정책은
 * `fetchStockPrice` 와 동일.
 */
export async function fetchStockPriceWithShares(
  ticker: string,
): Promise<StockPriceWithShares> {
  return withTossFallback(
    "현재가+상장주수",
    () => fetchStockPriceWithSharesToss(ticker),
    () => fetchStockPriceWithSharesKis(ticker),
  );
}

async function fetchStockPriceWithSharesKis(
  ticker: string,
): Promise<StockPriceWithShares> {
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

  const listed = toNumber(data.output.lstn_stcn);
  return {
    price: mapStockPrice(data.output, ticker),
    listedShares: listed > 0 ? listed : null,
  };
}

/**
 * 일자별 시세 조회. period = "D" / "W" / "M".
 */
export async function fetchStockDaily(
  ticker: string,
  period: "D" | "W" | "M" = "D",
): Promise<StockDailyCandle[]> {
  return withTossFallback(
    "일자별 시세",
    () => fetchStockDailyToss(ticker, period),
    () => fetchStockDailyKis(ticker, period),
  );
}

async function fetchStockDailyKis(
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
  return withTossFallback(
    "기간 차트",
    () => fetchStockDailyChartToss(ticker, fromDate, toDate, period),
    () => fetchStockDailyChartKis(ticker, fromDate, toDate, period),
  );
}

/** KIS 직행 경로 — `chartChunked.ts` 폴백 본문이 청크당 토스 재시도를 피하려고 직접 사용. */
export async function fetchStockDailyChartKis(
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

/** YYYY-MM-DD (오늘) — 분봉 응답 `stck_bsop_date` 누락 시 폴백 기준일. */
function todayYmd(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function asMinuteResponse(raw: unknown): {
  rt_cd: string;
  msg_cd: string;
  msg1: string;
  output2?: KisInquireTimeItemChartItem[];
} {
  return raw as {
    rt_cd: string;
    msg_cd: string;
    msg1: string;
    output2?: KisInquireTimeItemChartItem[];
  };
}

/**
 * 종목 **당일 분봉** 차트 — `inquire-time-itemchartprice` (TR_ID `FHKST03010200`).
 *
 * KIS 네이티브 해상도는 **1분봉**이며 1회 호출당 기준시각(`anchorHhmmss`) 이하로 ~30봉을 돌려준다.
 * 더 과거로 가려면 가장 이른 봉 직전 시각을 다음 `anchorHhmmss` 로 넘겨 역방향 페이징한다
 * (`minuteChartChunked.ts` 가 담당). N분봉(3/5/15)은 1분봉을 리샘플링해 만든다.
 *
 * @param ticker 종목코드 6자리.
 * @param anchorHhmmss 기준시각 HHMMSS(이하 봉 반환). "" 면 당일 최신부터.
 * @param includePast 과거 데이터 포함 여부(`FID_PW_DATA_INCU_YN`). 기본 true.
 * @returns 오름차순 1분봉 `StockMinuteCandle[]` (date="YYYY-MM-DDTHH:mm").
 */
export async function fetchStockMinuteChart(
  ticker: string,
  anchorHhmmss: string = "",
  includePast: boolean = true,
): Promise<StockMinuteCandle[]> {
  const client = getKisClient();
  const headers = await buildAuthHeaders("FHKST03010200");

  let response;
  try {
    response = await client.get(
      "/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice",
      {
        headers,
        params: {
          FID_COND_MRKT_DIV_CODE: "J",
          FID_INPUT_ISCD: ticker,
          FID_INPUT_HOUR_1: anchorHhmmss,
          FID_PW_DATA_INCU_YN: includePast ? "Y" : "N",
          FID_ETC_CLS_CODE: "",
        },
      },
    );
  } catch (error) {
    const status =
      typeof (error as { response?: { status?: number } }).response?.status === "number"
        ? (error as { response: { status: number } }).response.status
        : undefined;
    throw makeKisTransportError({
      status,
      message:
        error instanceof Error ? error.message : "KIS 분봉 시세 조회 중 네트워크 오류가 발생했어요.",
    });
  }

  const data = asMinuteResponse(response.data);
  if (data.rt_cd !== "0") {
    throw makeKisBusinessError(data.msg1, data.msg_cd);
  }

  const fallback = todayYmd();
  return (data.output2 ?? [])
    .map((it) => mapMinuteCandle(it, fallback))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 종목 **과거 다일 분봉** 차트 — `inquire-time-dailychartprice` (TR_ID `FHKST03010230`).
 *
 * 당일분봉(`fetchStockMinuteChart`)과 달리 과거 일자(`dateYyyymmdd`)의 1분봉을 조회한다.
 * 분봉 백테스트(검증 게이트)와 라이브 루프의 **전일 warmup prefetch** 에 사용한다.
 *
 * @param ticker 종목코드 6자리.
 * @param dateYyyymmdd 조회 일자 YYYYMMDD.
 * @param anchorHhmmss 기준시각 HHMMSS(이하 봉 반환). "" 면 해당일 최신(장 마감)부터.
 * @returns 오름차순 1분봉 `StockMinuteCandle[]`.
 */
export async function fetchStockMinuteDaily(
  ticker: string,
  dateYyyymmdd: string,
  anchorHhmmss: string = "",
): Promise<StockMinuteCandle[]> {
  const client = getKisClient();
  const headers = await buildAuthHeaders("FHKST03010230");

  let response;
  try {
    response = await client.get(
      "/uapi/domestic-stock/v1/quotations/inquire-time-dailychartprice",
      {
        headers,
        params: {
          FID_COND_MRKT_DIV_CODE: "J",
          FID_INPUT_ISCD: ticker,
          FID_INPUT_HOUR_1: anchorHhmmss,
          FID_INPUT_DATE_1: dateYyyymmdd,
          FID_PW_DATA_INCU_YN: "Y",
          FID_FAKE_TICK_INCU_YN: "N",
        },
      },
    );
  } catch (error) {
    const status =
      typeof (error as { response?: { status?: number } }).response?.status === "number"
        ? (error as { response: { status: number } }).response.status
        : undefined;
    throw makeKisTransportError({
      status,
      message:
        error instanceof Error ? error.message : "KIS 과거 분봉 시세 조회 중 네트워크 오류가 발생했어요.",
    });
  }

  const data = asMinuteResponse(response.data);
  if (data.rt_cd !== "0") {
    throw makeKisBusinessError(data.msg1, data.msg_cd);
  }

  const fallback =
    /^\d{8}$/.test(dateYyyymmdd)
      ? `${dateYyyymmdd.slice(0, 4)}-${dateYyyymmdd.slice(4, 6)}-${dateYyyymmdd.slice(6, 8)}`
      : todayYmd();
  return (data.output2 ?? [])
    .map((it) => mapMinuteCandle(it, fallback))
    .sort((a, b) => a.date.localeCompare(b.date));
}
