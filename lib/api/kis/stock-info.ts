/**
 * KIS 국내주식 기본정보(종목명·시장·거래정지/관리) 조회 호출.
 *
 * PRD `watchlist-real-data` §3.1.
 *
 * ## 엔드포인트
 *
 * - `GET /uapi/domestic-stock/v1/quotations/search-stock-info`
 *   - TR_ID = `CTPF1002R`
 *   - 쿼리: `PRDT_TYPE_CD=300` (주식/ETF/ETN/ELW), `PDNO=<6자리 ticker>`
 *
 * ## ⚠️ 실전 전용 — 모의(vts) 미지원
 *
 * 본 엔드포인트는 prod 키에서만 동작한다. BFF route 는 `isKisConfigured()` AND
 * `resolveKisEnv()==="prod"` 이중 게이트 통과 시에만 호출하고, 그 외엔 종목명 fallback
 * (symbols.json 시드 name → ticker) 을 사용한다. price.ts 의 `buildAuthHeaders` 패턴 답습.
 *
 * 본 모듈은 호출만 담당 — 응답 매핑은 `mappers.ts` 의 `mapStockInfo`.
 */

import { getKisClient } from "./client";
import { makeKisBusinessError, makeKisTransportError } from "./errors";
import { getAccessToken } from "./token";
import { mapStockInfo } from "./mappers";
import type {
  KisEnvelope,
  KisSearchStockInfoOutput,
  StockInfo,
} from "./types";
import { withTossFallback } from "@/lib/api/marketdata/source";
import { fetchStockInfoToss } from "@/lib/api/toss/stock-master";

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
 * 종목 기본정보 조회. KIS rt_cd != "0" 은 비즈니스 에러 (한글 msg1 통과).
 *
 * @param ticker 6자리 종목코드 — `PDNO` 로 그대로 사용 (응답 pdno 는 12자리 패딩이지만 입력값 유지).
 */
export async function fetchStockInfo(ticker: string): Promise<StockInfo> {
  return withTossFallback(
    "종목정보",
    () => fetchStockInfoToss(ticker),
    () => fetchStockInfoKis(ticker),
  );
}

async function fetchStockInfoKis(ticker: string): Promise<StockInfo> {
  const client = getKisClient();
  const headers = await buildAuthHeaders("CTPF1002R");

  let response;
  try {
    response = await client.get<KisEnvelope<KisSearchStockInfoOutput>>(
      "/uapi/domestic-stock/v1/quotations/search-stock-info",
      {
        headers,
        params: {
          PRDT_TYPE_CD: "300",
          PDNO: ticker,
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
          : "KIS 종목정보 조회 중 네트워크 오류가 발생했어요.",
    });
  }

  const data = response.data;
  if (data.rt_cd !== "0" || !data.output) {
    throw makeKisBusinessError(data.msg1, data.msg_cd);
  }

  return mapStockInfo(data.output, ticker);
}
