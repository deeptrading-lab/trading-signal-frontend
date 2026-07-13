/**
 * KIS 국내 업종 일자별 지수 차트 호출 — 지수 일봉 히스토리(종가) 취득.
 *
 * PRD `scorecard-relative-scoring` §구현범위-1.
 *
 * ## 엔드포인트
 *
 * - 일별 지수: `GET /uapi/domestic-stock/v1/quotations/inquire-daily-indexchartprice`
 *   - TR_ID = `FHKUP03500100`
 *   - 쿼리: `FID_COND_MRKT_DIV_CODE=U`(업종), `FID_INPUT_ISCD=<code>`
 *     ("0001" KOSPI / "1001" KOSDAQ), `FID_INPUT_DATE_1`~`FID_INPUT_DATE_2`(YYYYMMDD),
 *     `FID_PERIOD_DIV_CODE=D`.
 *   - 응답 output2 = 일별 봉 배열. 종가 = `bstp_nmix_prpr`(현재가=해당일 종가).
 *
 * ## ⚠️ 실전(prod) 전용
 *
 * `inquire-index-price` 와 동일 정책 — 모의(vts) 미지원. BFF/cron 이
 * `isKisConfigured()` && `resolveKisEnv()==="prod"` 게이트 통과 시에만 호출한다.
 *
 * fail-soft: 조회 실패는 transport/business 에러로 throw 전파한다(폴백 없음). 채점 호출부는
 * `fetchWithTransientRetryOrThrow` 로 감싸 transient 1회 재시도 후 실패면 그대로 throw →
 * 해당 horizon 을 pending 으로 유지(잘못된 0/skip 으로 채점 오염 금지).
 */

import { getKisClient } from "./client";
import { makeKisBusinessError, makeKisTransportError } from "./errors";
import { toNumber } from "./mappers";
import { getAccessToken } from "./token";
import type {
  IndexDailyClose,
  KisInquireDailyIndexChartItem,
  KisInquireDailyIndexChartResponse,
} from "./types";

type AuthHeaders = {
  authorization: string;
  appkey: string;
  appsecret: string;
  tr_id: string;
  custtype: "P";
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

/** YYYYMMDD → YYYY-MM-DD. 8자리 숫자 아니면 그대로 통과(디펜시브). */
function formatIndexDate(raw: string | undefined): string {
  if (raw && /^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return raw ?? "";
}

function mapIndexCandle(item: KisInquireDailyIndexChartItem): IndexDailyClose {
  return {
    date: formatIndexDate(item.stck_bsop_date),
    close: toNumber(item.bstp_nmix_prpr),
  };
}

/**
 * 국내 업종 일별 지수 차트 단일 호출(최대 ~100봉). KIS rt_cd != "0" 은 비즈니스 에러.
 *
 * @param code 업종 코드 ("0001" KOSPI / "1001" KOSDAQ).
 * @param fromDate 조회 시작 YYYYMMDD.
 * @param toDate   조회 종료 YYYYMMDD.
 * @returns 오름차순 정렬·종가>0 인 `IndexDailyClose[]`.
 */
export async function fetchIndexDailyChart(
  code: string,
  fromDate: string,
  toDate: string,
): Promise<IndexDailyClose[]> {
  const client = getKisClient();
  const headers = await buildAuthHeaders("FHKUP03500100");

  let response;
  try {
    response = await client.get<KisInquireDailyIndexChartResponse>(
      "/uapi/domestic-stock/v1/quotations/inquire-daily-indexchartprice",
      {
        headers,
        params: {
          FID_COND_MRKT_DIV_CODE: "U",
          FID_INPUT_ISCD: code,
          FID_INPUT_DATE_1: fromDate,
          FID_INPUT_DATE_2: toDate,
          FID_PERIOD_DIV_CODE: "D",
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
          : "KIS 지수 차트 조회 중 네트워크 오류가 발생했어요.",
    });
  }

  const data = response.data;
  if (data.rt_cd !== "0") {
    throw makeKisBusinessError(data.msg1, data.msg_cd);
  }

  const rawRows = data.output2 ?? [];
  const mapped = rawRows
    .map(mapIndexCandle)
    .filter((c) => c.date !== "" && Number.isFinite(c.close) && c.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  // 스키마 불일치 가드: KIS 가 봉을 돌려줬는데(rt_cd="0", output2 비어있지 않음) 매핑 결과가 0건이면
  // 종가 필드명 오기 등 응답 스키마 변경을 의심하고 throw 한다. (과거 `bstp_nmix_clpr` 오기로
  // 지수 일봉이 조용히 빈 배열이 돼 채점이 무한 pending 되던 회귀 재발 방지 — throw 시 채점
  // 호출부의 errors 카운터·KV 마커에 잡혀 관측 가능해진다.)
  if (rawRows.length > 0 && mapped.length === 0) {
    throw makeKisBusinessError(
      "KIS 지수 차트 응답에서 유효한 종가를 파싱하지 못했어요(스키마 불일치 의심).",
      data.msg_cd,
    );
  }

  return mapped;
}
