/**
 * KIS 업종 구성종목(대표/급등) 호출 — "지금 뜨는 산업" 구성종목 모달.
 *
 * PRD `trending-sectors` §3-2 / AC-0 실측.
 *
 * ## 구성종목 = `FHPST01700000` + 업종 필터
 *
 * `GET /uapi/domestic-stock/v1/ranking/fluctuation`(등락률 순위)에 `fid_input_iscd=<업종코드>` 를 넣으면
 * KIS 가 **그 업종 종목만** 필터해 top-30(등락률순)으로 돌려준다. 별도 시세콜 없이 항목이 현재가·등락·
 * 거래량을 포함한다. 즉 이 top-30 은 전체 membership 이 아니라 **대표/급등 종목**(DESIGN "대표 종목" UX).
 * 항목: `hts_kor_isnm`(종목명)·`stck_shrn_iscd`(코드)·`stck_prpr`(현재가)·`prdy_ctrt`(등락률).
 *
 * ## 시가총액 = 토스 마스터 best-effort(배치)
 *
 * KIS fluctuation 응답엔 시총이 없다. 시가총액 정렬용 값은 토스 마스터 `sharesOutstanding × 현재가`
 * (`getTossStockMaster` 자산 재사용)로 채운다. **비용 주석**: 구성종목 수(≤30)만큼 `/api/v1/stocks`
 * 조회가 필요해 동시성 캡 배치 + 24h 캐시로 억제하고, 토스 미설정·실패는 `marketCap=null`(fail-soft →
 * 정렬 시 후순위). 수익률(등락률) 정렬은 시총 없이도 항상 동작한다.
 *
 * ## ⚠️ 실전(prod) 전용
 *
 * fluctuation TR 은 모의(vts) 미지원. BFF route 가 `resolveKisEnv()==="prod"` 이중 게이트 통과 시에만 호출.
 */

import { getKisClient } from "./client";
import { makeKisBusinessError, makeKisTransportError } from "./errors";
import { toNumber } from "./mappers";
import { getAccessToken } from "./token";
import { loadMarketCaps } from "./marketCapEnrich";
import type { FlowDirection } from "@/lib/types/flow/top10";
import type { SectorConstituent } from "@/lib/types/market/sectors";

/** KIS fluctuation output 1행(구성종목 매핑에 쓰는 필드만). */
export type KisSectorConstituentItem = {
  stck_shrn_iscd?: string;
  hts_kor_isnm?: string;
  stck_prpr?: string;
  prdy_ctrt?: string;
};

function directionFromPercent(changePct: number): FlowDirection {
  if (changePct > 0) return "up";
  if (changePct < 0) return "down";
  return "flat";
}

/**
 * fluctuation output 1행 → `SectorConstituent`(marketCap 은 아직 null — 배치 enrich 가 채움).
 */
export function mapSectorConstituentItem(
  item: KisSectorConstituentItem,
): SectorConstituent {
  const ticker = item.stck_shrn_iscd?.trim() ?? "";
  const changePct = toNumber(item.prdy_ctrt);
  return {
    ticker,
    name: item.hts_kor_isnm?.trim() || ticker,
    price: toNumber(item.stck_prpr),
    changePct,
    direction: directionFromPercent(changePct),
    marketCap: null,
  };
}

/**
 * 구성종목에 시가총액(토스 마스터 `sharesOutstanding × price`)을 best-effort 로 채운다.
 *
 * 공용 `loadMarketCaps`(`marketCapEnrich.ts`) 배치 로더를 재사용한다 — 토스 미설정이면 원본(전부 null),
 * 설정 시 동시성 캡 배치로 계산, 실패·미상장은 null 유지(fail-soft). 원본 순서 보존.
 */
export async function enrichMarketCap(
  constituents: SectorConstituent[],
): Promise<SectorConstituent[]> {
  if (constituents.length === 0) return constituents;
  const caps = await loadMarketCaps(constituents);
  return constituents.map((c) => ({
    ...c,
    marketCap: caps.get(c.ticker) ?? c.marketCap,
  }));
}

/**
 * 업종 구성종목(대표/급등 top-30) 조회 — fluctuation + 업종 필터 + 시총 best-effort enrich.
 *
 * @param code 업종 코드(4자리, `bstp_cls_code`).
 */
export async function fetchSectorConstituents(
  code: string,
): Promise<SectorConstituent[]> {
  const client = getKisClient();
  const accessToken = await getAccessToken();

  let response;
  try {
    response = await client.get<{
      rt_cd: string;
      msg_cd: string;
      msg1: string;
      output?: KisSectorConstituentItem[];
    }>("/uapi/domestic-stock/v1/ranking/fluctuation", {
      headers: {
        authorization: `Bearer ${accessToken}`,
        appkey: process.env.KIS_APP_KEY ?? "",
        appsecret: process.env.KIS_APP_SECRET ?? "",
        tr_id: "FHPST01700000",
        custtype: "P",
      },
      params: {
        fid_cond_mrkt_div_code: "J", // KRX.
        fid_cond_scr_div_code: "20170", // 고정.
        fid_input_iscd: code, // ← 업종코드: KIS 가 해당 업종 종목만 필터.
        fid_rank_sort_cls_code: "0", // 상승율순(급등 대표 종목 우선).
        fid_input_cnt_1: "0",
        fid_prc_cls_code: "1", // 종가대비 — 전일종가 대비 등락률순.
        fid_input_price_1: "",
        fid_input_price_2: "",
        fid_vol_cnt: "",
        fid_trgt_cls_code: "0",
        fid_trgt_exls_cls_code: "0",
        fid_div_cls_code: "0",
        fid_rsfl_rate1: "",
        fid_rsfl_rate2: "",
      },
    });
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
          : "KIS 업종 구성종목 조회 중 네트워크 오류가 발생했어요.",
    });
  }

  const data = response.data;
  if (data.rt_cd !== "0" || !data.output) {
    throw makeKisBusinessError(data.msg1, data.msg_cd);
  }

  const constituents = data.output
    .map(mapSectorConstituentItem)
    .filter((c) => /^\d{6}$/.test(c.ticker)); // 정규 6자리 종목만(NaN·비정형 방어).
  return enrichMarketCap(constituents);
}
