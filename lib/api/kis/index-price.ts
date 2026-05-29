/**
 * KIS 국내 업종 현재지수 호출.
 *
 * PRD `market-real-data` §3.1.
 *
 * ## 엔드포인트
 *
 * - 현재지수: `GET /uapi/domestic-stock/v1/quotations/inquire-index-price`
 *   - TR_ID = `FHPUP02100000`
 *   - 쿼리: `FID_COND_MRKT_DIV_CODE=U` (U=업종), `FID_INPUT_ISCD=<code>`
 *     (`0001` KOSPI / `1001` KOSDAQ / `2001` KOSPI200)
 *
 * ## ⚠️ 실전(prod) 전용
 *
 * `inquire-index-price` 는 모의(vts) 미지원. BFF route 가 `resolveKisEnv()==="prod"`
 * 이중 게이트를 통과한 경우에만 본 함수를 호출한다 (PRD §3.8).
 *
 * 본 모듈은 호출만 담당 — 응답 매핑은 `mappers.ts` 의 `mapIndexPrice`.
 * 지수명은 응답에 없으므로 `mappers` 의 `INDEX_NAME_BY_CODE` 상수로 부여 (종목명 API 미사용).
 */

import { getKisClient } from "./client";
import { makeKisBusinessError, makeKisTransportError } from "./errors";
import { mapIndexPrice } from "./mappers";
import { getAccessToken } from "./token";
import type {
  KisEnvelope,
  KisInquireIndexPriceOutput,
  MarketIndexQuote,
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

/**
 * 국내 업종 현재지수 조회. KIS rt_cd != "0" 은 비즈니스 에러 (한글 msg1 통과).
 *
 * @param code 업종 코드 ("0001"/"1001"/"2001").
 */
export async function fetchIndexPrice(code: string): Promise<MarketIndexQuote> {
  const client = getKisClient();
  const headers = await buildAuthHeaders("FHPUP02100000");

  let response;
  try {
    response = await client.get<KisEnvelope<KisInquireIndexPriceOutput>>(
      "/uapi/domestic-stock/v1/quotations/inquire-index-price",
      {
        headers,
        params: {
          FID_COND_MRKT_DIV_CODE: "U",
          FID_INPUT_ISCD: code,
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
          : "KIS 지수 조회 중 네트워크 오류가 발생했어요.",
    });
  }

  const data = response.data;
  if (data.rt_cd !== "0" || !data.output) {
    throw makeKisBusinessError(data.msg1, data.msg_cd);
  }

  return mapIndexPrice(data.output, code);
}
