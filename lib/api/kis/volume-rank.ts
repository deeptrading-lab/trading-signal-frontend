/**
 * KIS 거래량 순위 호출 — `GET /uapi/domestic-stock/v1/quotations/volume-rank`, TR_ID `FHPST01710000`.
 *
 * `docs/references/kis-api/domestic-stock-rankings.md` §2 — URL 이 ranking/ 이 아니라 quotations/,
 * 파라미터 키는 대문자 FID_, **실전(prod) 전용(모의 미지원)** · 최대 30건 · 다음조회 불가.
 * BFF(`/api/market/volume-rank`)가 수급 랭킹(flow/top10)과 동일한 이중 게이트 + mock fallback 으로 감싼다.
 */

import { getKisClient } from "./client";
import { makeKisBusinessError, makeKisTransportError } from "./errors";
import { toNumber } from "./mappers";
import { getAccessToken } from "./token";
import type { KisEnvelope } from "./types";
import type { FlowDirection } from "@/lib/types/flow/top10";
import type { VolumeRankRow } from "@/lib/types/market/volumeRank";

/** KIS volume-rank output 1행(사용 필드만). */
type KisVolumeRankItem = {
  mksc_shrn_iscd?: string;
  hts_kor_isnm?: string;
  stck_prpr?: string;
  prdy_ctrt?: string;
  acml_vol?: string;
};

function directionFromPercent(changePercent: number): FlowDirection {
  if (changePercent > 0) return "up";
  if (changePercent < 0) return "down";
  return "flat";
}

/**
 * 거래량 순위 조회(KRX 보통주, 평균거래량 기준) — 전 행 매핑 반환, 상위 slice 는 BFF 책임.
 * FID_TRGT/EXLS 는 KIS 포털 샘플 관례값(대상 전체 포함·제외 없음).
 */
export async function fetchVolumeRank(): Promise<VolumeRankRow[]> {
  const client = getKisClient();
  const accessToken = await getAccessToken();

  let response;
  try {
    response = await client.get<KisEnvelope<KisVolumeRankItem[]>>(
      "/uapi/domestic-stock/v1/quotations/volume-rank",
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
          appkey: process.env.KIS_APP_KEY ?? "",
          appsecret: process.env.KIS_APP_SECRET ?? "",
          tr_id: "FHPST01710000",
          custtype: "P",
        },
        params: {
          FID_COND_MRKT_DIV_CODE: "J",
          FID_COND_SCR_DIV_CODE: "20171", // 고정.
          FID_INPUT_ISCD: "0000", // 전체.
          FID_DIV_CLS_CODE: "1", // 보통주(ETF·우선주 제외 — 단타 후보 노이즈 축소).
          FID_BLNG_CLS_CODE: "0", // 평균거래량 기준.
          FID_TRGT_CLS_CODE: "111111111",
          FID_TRGT_EXLS_CLS_CODE: "0000000000",
          FID_INPUT_PRICE_1: "",
          FID_INPUT_PRICE_2: "",
          FID_VOL_CNT: "",
          FID_INPUT_DATE_1: "",
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
        error instanceof Error
          ? error.message
          : "KIS 거래량 순위 조회 중 네트워크 오류가 발생했어요.",
    });
  }

  const data = response.data;
  if (data.rt_cd !== "0" || !data.output) {
    throw makeKisBusinessError(data.msg1, data.msg_cd);
  }

  return data.output.map((item) => {
    const ticker = item.mksc_shrn_iscd?.trim() ?? "";
    const changePercent = toNumber(item.prdy_ctrt);
    return {
      ticker,
      name: item.hts_kor_isnm?.trim() || ticker,
      price: toNumber(item.stck_prpr),
      changePercent,
      direction: directionFromPercent(changePercent),
      volume: toNumber(item.acml_vol),
    };
  });
}
