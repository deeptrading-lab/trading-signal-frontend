/**
 * KIS 등락률 순위(급상승/급하락) 호출 — `GET /uapi/domestic-stock/v1/ranking/fluctuation`, TR_ID `FHPST01700000`.
 *
 * `docs/references/kis-api/domestic-stock-rankings.md` §1 — URL 은 `ranking/`, 파라미터 키는 소문자 fid_,
 * **실전(prod) 전용(모의 미지원)** · 최대 30건 · 다음조회 불가. 코드 검증상 시장분류는 `J`/`W`/`Q` 만 허용.
 * BFF(`/api/market/fluctuation`)가 거래량 순위(volume-rank)와 동일한 이중 게이트 + mock fallback 으로 감싼다.
 *
 * ⚠️ 종목코드 필드가 volume-rank 와 다르다: fluctuation 은 `stck_shrn_iscd`(volume-rank 는 `mksc_shrn_iscd`).
 */

import { getKisClient } from "./client";
import { makeKisBusinessError, makeKisTransportError } from "./errors";
import { toNumber } from "./mappers";
import { getAccessToken } from "./token";
import type { KisEnvelope } from "./types";
import type { FlowDirection } from "@/lib/types/flow/top10";
import type {
  FluctuationDirection,
  FluctuationRow,
} from "@/lib/types/market/fluctuation";

/** KIS fluctuation output 1행(사용 필드만). */
export type KisFluctuationItem = {
  stck_shrn_iscd?: string;
  hts_kor_isnm?: string;
  stck_prpr?: string;
  prdy_ctrt?: string;
  prdy_vrss_sign?: string;
};

/**
 * 정렬 방향 → `fid_rank_sort_cls_code` 매핑.
 *   - `up`(급상승)   → `"0"` 상승율순
 *   - `down`(급하락) → `"1"` 하락율순
 */
export function rankSortCodeForDirection(
  direction: FluctuationDirection,
): "0" | "1" {
  return direction === "down" ? "1" : "0";
}

function directionFromPercent(changePercent: number): FlowDirection {
  if (changePercent > 0) return "up";
  if (changePercent < 0) return "down";
  return "flat";
}

/**
 * KIS fluctuation output 1행 → 화면 친화 `FluctuationRow`.
 *
 * 방향은 changePercent 부호 기준(volume-rank 관례 정합) — 표시하는 등락률과 항상 일관.
 */
export function mapFluctuationItem(item: KisFluctuationItem): FluctuationRow {
  const ticker = item.stck_shrn_iscd?.trim() ?? "";
  const changePercent = toNumber(item.prdy_ctrt);
  return {
    ticker,
    name: item.hts_kor_isnm?.trim() || ticker,
    price: toNumber(item.stck_prpr),
    changePercent,
    direction: directionFromPercent(changePercent),
  };
}

/**
 * 등락률 순위 조회(KRX, 전일 종가대비 등락률순) — 전 행 매핑 반환, 상위 slice·ETP 필터는 BFF 책임.
 *
 * `fid_prc_cls_code=1`(종가대비) 로 전일종가 대비 등락률(prdy_ctrt) 순 정렬 — 화면에 표시하는 등락률과 일치.
 * `fid_trgt_cls_code`/`fid_trgt_exls_cls_code` 는 대상 전체 포함·제외 없음(기본값).
 */
export async function fetchFluctuation(
  direction: FluctuationDirection = "up",
): Promise<FluctuationRow[]> {
  const client = getKisClient();
  const accessToken = await getAccessToken();

  let response;
  try {
    response = await client.get<KisEnvelope<KisFluctuationItem[]>>(
      "/uapi/domestic-stock/v1/ranking/fluctuation",
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
          appkey: process.env.KIS_APP_KEY ?? "",
          appsecret: process.env.KIS_APP_SECRET ?? "",
          tr_id: "FHPST01700000",
          custtype: "P",
        },
        params: {
          fid_cond_mrkt_div_code: "J", // KRX.
          fid_cond_scr_div_code: "20170", // 고정(다른 값이면 ValueError).
          fid_input_iscd: "0000", // 전체.
          fid_rank_sort_cls_code: rankSortCodeForDirection(direction), // 0:상승율순 / 1:하락율순.
          fid_input_cnt_1: "0", // 전체.
          fid_prc_cls_code: "1", // 종가대비 — 전일종가 대비 등락률(prdy_ctrt) 순.
          fid_input_price_1: "",
          fid_input_price_2: "",
          fid_vol_cnt: "",
          fid_trgt_cls_code: "0", // 대상 전체.
          fid_trgt_exls_cls_code: "0", // 제외 없음.
          fid_div_cls_code: "0", // 전체.
          fid_rsfl_rate1: "",
          fid_rsfl_rate2: "",
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
          : "KIS 등락률 순위 조회 중 네트워크 오류가 발생했어요.",
    });
  }

  const data = response.data;
  if (data.rt_cd !== "0" || !data.output) {
    throw makeKisBusinessError(data.msg1, data.msg_cd);
  }

  return data.output.map(mapFluctuationItem);
}
