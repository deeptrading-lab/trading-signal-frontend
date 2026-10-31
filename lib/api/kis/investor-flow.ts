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

/** 종목별 일별 투자자 매매 1일 — 스윙 규칙서 수급 입력(PRD `swing-judgment`). */
export type InvestorTradeDay = {
  /** YYYY-MM-DD. */
  date: string;
  /** 누적 거래대금 — **원**. 포털 문서는 백만원이라 적었지만 2026-10-31 probe 실측은 원(종가×거래량과 일치). */
  tradingValue: number;
  /** 주체별 순매수 거래대금 — **백만원**, 음수 = 순매도. */
  person: number;
  foreign: number;
  /** 기관계(증권·투신·사모·은행·보험·종금·연기금 합). */
  institution: number;
  /** 연기금(포털 표기 "기금", 키 `fund_*`). */
  pension: number;
  /** 사모펀드(키 `pe_fund_*`). */
  privateEquity: number;
};

/** 수급 1일에 꼭 있어야 하는 원본 키 — 하나라도 없거나 숫자가 아니면 그 응답 전체를 거부한다(0 으로 채우지 않는다). */
const INVESTOR_TRADE_KEYS = {
  tradingValue: "acml_tr_pbmn",
  person: "prsn_ntby_tr_pbmn",
  foreign: "frgn_ntby_tr_pbmn",
  institution: "orgn_ntby_tr_pbmn",
  pension: "fund_ntby_tr_pbmn",
  privateEquity: "pe_fund_ntby_tr_pbmn",
} as const satisfies Record<keyof Omit<InvestorTradeDay, "date">, string>;

/**
 * 표면 C — 종목별 일별 투자자 매매(`FHPTJ04160001`, KRX 'J'). ⚠️ 실전 전용.
 *
 * `toDate`(YYYYMMDD) **이하** 최근 약 30거래일을 오름차순으로 돌려준다. 더 과거는 가장 이른 날
 * 직전 날짜를 다음 `toDate` 로 넘겨 페이징한다(2021-11 까지 조회 확인, 2026-10-31 probe).
 * 당일 데이터는 15:40 이후 가집계 — 스윙 판정은 다음 날 아침에 확정치로 돈다.
 *
 * 오프라인 수집기(`scripts/swing/collect.mts`)와 라이브(PR-2)가 이 함수 하나를 같이 써서 파라미터가
 * 어긋날 여지를 없앤다.
 */
export async function fetchInvestorTradeDaily(
  ticker: string,
  toDate: string,
): Promise<InvestorTradeDay[]> {
  const client = getKisClient();
  const headers = await buildAuthHeaders("FHPTJ04160001");

  let response;
  try {
    response = await client.get<KisEnvelope<unknown> & { output2?: Record<string, string>[] }>(
      "/uapi/domestic-stock/v1/quotations/investor-trade-by-stock-daily",
      {
        headers,
        params: {
          FID_COND_MRKT_DIV_CODE: "J",
          FID_INPUT_ISCD: ticker,
          FID_INPUT_DATE_1: toDate,
          FID_ORG_ADJ_PRC: "",
          FID_ETC_CLS_CODE: "1",
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
          : "KIS 종목 투자자 매매 조회 중 네트워크 오류가 발생했어요.",
    });
  }

  const data = response.data;
  if (data.rt_cd !== "0") {
    throw makeKisBusinessError(data.msg1, data.msg_cd);
  }

  return (data.output2 ?? [])
    .filter((row) => /^\d{8}$/.test(row.stck_bsop_date ?? ""))
    .map((row) => mapInvestorTradeDay(row, ticker))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** 원본 1행 → `InvestorTradeDay`. 키 누락·비숫자는 throw(가짜 0 차단). */
export function mapInvestorTradeDay(
  row: Record<string, string>,
  ticker: string,
): InvestorTradeDay {
  const out = { date: formatDate(row.stck_bsop_date) } as InvestorTradeDay;
  for (const [field, key] of Object.entries(INVESTOR_TRADE_KEYS) as Array<
    [keyof typeof INVESTOR_TRADE_KEYS, string]
  >) {
    const raw = row[key];
    const value = raw === undefined || raw.trim() === "" ? Number.NaN : Number(raw);
    if (!Number.isFinite(value)) {
      throw makeKisTransportError({
        message: `KIS 투자자 매매 응답에 ${key} 값이 없어요(${ticker} ${row.stck_bsop_date}).`,
      });
    }
    out[field] = value;
  }
  return out;
}
