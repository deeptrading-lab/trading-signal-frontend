/**
 * KIS 수급(외국인·기관·개인 순매수) 호출 — 표면 A·B 두 TR 을 한 파일에 격리.
 *
 * PRD `investor-flow` §6.1 / §6.2.
 *
 * ## 표면 A — 시장 전체 외국인/기관 순매수 랭킹
 *
 * - `GET /uapi/domestic-stock/v1/quotations/foreign-institution-total`, TR_ID `FHPTJ04400000`.
 * - ⚠️ 실전(prod) 전용 가능성 + `FID_INPUT_ISCD=0000` 합산동작 미검증 → BFF(`/api/flow/top10`)가
 *   `isKisConfigured()` AND `resolveKisEnv()==="prod"` 이중 게이트 + mock fallback 으로 안전 처리.
 *
 * ## 표면 B — 종목별 개인/외국인/기관 최근 N일 추이
 *
 * - `GET /uapi/domestic-stock/v1/quotations/inquire-investor`, TR_ID `FHKST01010900`.
 * - ✅ 실전·모의 둘 다 동작(TR_ID 동일) → BFF(`/api/stock/investors`)는 `isKisConfigured()` 만
 *   충족하면 호출(env 무관), 미설정 시 mock fallback.
 *
 * 본 모듈은 호출 + 도메인 모델 매핑까지 담당한다(시세/지수 매퍼와 달리 수급 도메인 모델은
 * `lib/types/flow`·`lib/types/stock` 에 있어 본 파일에 인접 매퍼를 둔다). KIS rt_cd != "0" 은
 * 비즈니스 에러(한글 msg1 통과), HTTP 5xx/네트워크는 transport 에러.
 */

import { getKisClient } from "./client";
import { makeKisBusinessError, makeKisTransportError } from "./errors";
import { toNumber } from "./mappers";
import { getAccessToken } from "./token";
import type {
  KisEnvelope,
  KisForeignInstitutionTotalItem,
  KisInquireInvestorItem,
} from "./types";
import type {
  FlowDirection,
  InvestorFlowRow,
} from "@/lib/types/flow/top10";
import type {
  StockInvestorDay,
  StockInvestorTrend,
} from "@/lib/types/stock/investors";

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

/** changePercent 부호 → up/down/flat (등락률 기반 — PRD 요구 direction). */
function directionFromPercent(changePercent: number): FlowDirection {
  if (changePercent > 0) return "up";
  if (changePercent < 0) return "down";
  return "flat";
}

/** YYYYMMDD → YYYY-MM-DD (8자리 숫자만 변환, 그 외 통과). */
function formatDate(value: string | undefined): string {
  if (value && /^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  return value ?? "";
}

/** 표면 A 주체 — 외국인/기관. KIS `FID_ETC_CLS_CODE` 1/2 로 매핑. */
export type ForeignInstitutionSubject = "frgn" | "orgn";

/**
 * 표면 A — 시장 전체 외국인 또는 기관 순매수 랭킹 조회(거래대금 정렬, 순매수 상위).
 *
 * subject 가 "frgn"(외국인) 이면 `FID_ETC_CLS_CODE=1` + `frgn_ntby_*` 를, "orgn"(기관) 이면
 * `=2` + `orgn_ntby_*` 를 읽는다. 상위 slice 는 BFF 책임(본 함수는 전 행 매핑 반환).
 */
export async function fetchForeignInstitutionTotal(
  subject: ForeignInstitutionSubject,
): Promise<InvestorFlowRow[]> {
  const client = getKisClient();
  const headers = await buildAuthHeaders("FHPTJ04400000");

  let response;
  try {
    response = await client.get<
      KisEnvelope<KisForeignInstitutionTotalItem[]>
    >("/uapi/domestic-stock/v1/quotations/foreign-institution-total", {
      headers,
      params: {
        FID_COND_MRKT_DIV_CODE: "V",
        FID_COND_SCR_DIV_CODE: "16449",
        FID_INPUT_ISCD: "0000", // 전체 합산(§9 q1 — prod 검증 의존).
        FID_DIV_CLS_CODE: "1", // 금액(거래대금) 정렬.
        FID_RANK_SORT_CLS_CODE: "0", // 순매수 상위.
        FID_ETC_CLS_CODE: subject === "frgn" ? "1" : "2",
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
          : "KIS 수급 랭킹 조회 중 네트워크 오류가 발생했어요.",
    });
  }

  const data = response.data;
  if (data.rt_cd !== "0" || !data.output) {
    throw makeKisBusinessError(data.msg1, data.msg_cd);
  }

  return data.output.map((item) =>
    mapForeignInstitutionRow(item, subject),
  );
}

/** KIS 랭킹 1행 → `InvestorFlowRow`. 주체별 순매수 필드를 선택 매핑. */
function mapForeignInstitutionRow(
  item: KisForeignInstitutionTotalItem,
  subject: ForeignInstitutionSubject,
): InvestorFlowRow {
  const ticker = item.mksc_shrn_iscd?.trim() ?? "";
  const changePercent = toNumber(item.prdy_ctrt);
  const netBuyAmount =
    subject === "frgn"
      ? toNumber(item.frgn_ntby_tr_pbmn)
      : toNumber(item.orgn_ntby_tr_pbmn);
  const netBuyQty =
    subject === "frgn"
      ? toNumber(item.frgn_ntby_qty)
      : toNumber(item.orgn_ntby_qty);

  return {
    ticker,
    name: item.hts_kor_isnm?.trim() || ticker,
    price: toNumber(item.stck_prpr),
    changePercent,
    // 등락률 부호 기반(PRD). prdy_vrss_sign 이 더 풍부하지만 direction 계약은 부호 기준.
    direction: directionFromPercent(changePercent),
    netBuyAmount,
    netBuyQty,
  };
}

/**
 * 표면 B — 종목별 개인/외국인/기관 일자별 순매수 추이 조회(최근 N일, 다음조회 불가).
 *
 * 실전·모의 둘 다 동작(TR_ID 동일). N일 slice 는 BFF 책임(본 함수는 전 행 매핑 반환).
 */
export async function fetchInvestorTrend(
  ticker: string,
): Promise<StockInvestorTrend> {
  const client = getKisClient();
  const headers = await buildAuthHeaders("FHKST01010900");

  let response;
  try {
    response = await client.get<KisEnvelope<KisInquireInvestorItem[]>>(
      "/uapi/domestic-stock/v1/quotations/inquire-investor",
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
          : "KIS 종목 수급 조회 중 네트워크 오류가 발생했어요.",
    });
  }

  const data = response.data;
  if (data.rt_cd !== "0" || !data.output) {
    throw makeKisBusinessError(data.msg1, data.msg_cd);
  }

  return { days: data.output.map(mapInvestorDay) };
}

/** KIS 일자 1건 → `StockInvestorDay`. 음수(순매도) 부호 보존. */
function mapInvestorDay(item: KisInquireInvestorItem): StockInvestorDay {
  return {
    date: formatDate(item.stck_bsop_date),
    close: toNumber(item.stck_clpr),
    changeSign: item.prdy_vrss_sign?.trim() ?? "3",
    personNetBuyAmount: toNumber(item.prsn_ntby_tr_pbmn),
    personNetBuyQty: toNumber(item.prsn_ntby_qty),
    foreignNetBuyAmount: toNumber(item.frgn_ntby_tr_pbmn),
    foreignNetBuyQty: toNumber(item.frgn_ntby_qty),
    orgNetBuyAmount: toNumber(item.orgn_ntby_tr_pbmn),
    orgNetBuyQty: toNumber(item.orgn_ntby_qty),
  };
}
