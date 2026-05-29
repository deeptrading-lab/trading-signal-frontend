/**
 * KIS 관심종목 복수 시세 일괄조회 호출.
 *
 * PRD `watchlist-batch-quotes` §3.1.
 *
 * ## 엔드포인트
 *
 * - 일괄 시세: `GET /uapi/domestic-stock/v1/quotations/intstock-multprice`
 *   - TR_ID = `FHKST11300006`
 *   - 쿼리: 종목별 `FID_COND_MRKT_DIV_CODE_<i>`("J"=주식) / `FID_INPUT_ISCD_<i>`(6자리 ticker)
 *     쌍을 `_1` ~ `_30` 으로 번호 인덱싱. **한 번의 호출에 최대 30종목.**
 *
 * ## 콜 수 — N종목 → ⌈N/30⌉ 콜
 *
 * 30종목 단위 chunk 로 분할 호출(soft cap 30 운용 시 1콜). 청크는 `Promise.allSettled` 로 모아
 * 성공 청크의 종목만 합친다(부분 성공). 종목당 N콜(`inquire-price`) 구조의 rate-limit(`EGW00201`)을
 * 근본 회피한다. 30 초과 입력도 동작하도록 작성(본 트랙 cap 30 = 1콜 보장).
 *
 * ## ⚠️ 종목명 미동봉
 *
 * 본 호출은 표시용 종목명을 신뢰 가능하게 돌려주지 않는다. 매퍼(`mapIntstockMultprice`)는 `name` 을
 * ticker 로만 두고, 표시 종목명은 BFF 시드 fallback → 클라 store 가 결정한다. `search-stock-info`
 * (`hts_kor_isnm`/`bstp_kor_isnm`) 를 사용하지 않는다.
 *
 * 본 모듈은 호출만 담당 — 응답 매핑은 `mappers.ts` 의 `mapIntstockMultprice`.
 */

import { getKisClient } from "./client";
import { makeKisBusinessError, makeKisTransportError } from "./errors";
import { mapIntstockMultprice } from "./mappers";
import { getAccessToken } from "./token";
import type {
  KisEnvelope,
  KisIntstockMultpriceItem,
  WatchlistQuote,
} from "./types";

/** 한 번의 호출에 담을 수 있는 최대 종목 수 (KIS 사양). */
export const MULTPRICE_CHUNK_SIZE = 30;

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
 * 관심종목 일괄 시세 조회 — 최대 30종목/콜. 30 초과는 chunk 분할(⌈N/30⌉ 콜).
 *
 * 청크별 `Promise.allSettled` 로 부분 성공을 허용한다(성공 청크 종목만 반환). 전체 청크 실패 시
 * 마지막 실패 사유를 throw — BFF 가 한글 에러/mock 으로 분기한다.
 *
 * 응답은 입력 ticker 순서로 좌조인한다(응답 누락 종목은 결과에서 빠짐 → BFF/프론트가 디그레이드).
 *
 * @param tickers 6자리 종목코드 배열.
 */
export async function fetchIntstockMultprice(
  tickers: readonly string[],
): Promise<WatchlistQuote[]> {
  const cleaned = tickers.map((t) => t.trim()).filter(Boolean);
  if (cleaned.length === 0) return [];

  const chunks = chunk(cleaned, MULTPRICE_CHUNK_SIZE);
  const settled = await Promise.allSettled(
    chunks.map((group) => fetchOneChunk(group)),
  );

  const quotes: WatchlistQuote[] = [];
  let lastReason: unknown;
  let anyFulfilled = false;
  for (const result of settled) {
    if (result.status === "fulfilled") {
      anyFulfilled = true;
      quotes.push(...result.value);
    } else {
      lastReason = result.reason;
    }
  }

  // 모든 청크 실패 → 사유 전파(전체 실패). 일부 성공 → 성공분만 반환(부분 성공).
  if (!anyFulfilled) {
    throw lastReason ?? makeKisTransportError({ message: undefined });
  }
  return quotes;
}

/** 단일 청크(≤30종목) 1콜. 입력 ticker 순서로 좌조인. */
async function fetchOneChunk(
  tickers: string[],
): Promise<WatchlistQuote[]> {
  const client = getKisClient();
  const headers = await buildAuthHeaders("FHKST11300006");

  let response;
  try {
    response = await client.get<KisEnvelope<KisIntstockMultpriceItem[]>>(
      "/uapi/domestic-stock/v1/quotations/intstock-multprice",
      {
        headers,
        params: buildMultpriceParams(tickers),
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
          : "KIS 관심종목 일괄 시세 조회 중 네트워크 오류가 발생했어요.",
    });
  }

  const data = response.data;
  if (data.rt_cd !== "0" || !data.output) {
    throw makeKisBusinessError(data.msg1, data.msg_cd);
  }

  return joinByTicker(tickers, data.output);
}

/**
 * 번호 인덱스 파라미터 빌드 — `FID_COND_MRKT_DIV_CODE_1`/`FID_INPUT_ISCD_1` ~ `_30`.
 * 시장구분은 전부 "J"(주식). 입력 종목 수만큼만 채운다(빈 슬롯 미전송).
 */
function buildMultpriceParams(tickers: string[]): Record<string, string> {
  const params: Record<string, string> = {};
  tickers.forEach((ticker, i) => {
    const n = i + 1;
    params[`FID_COND_MRKT_DIV_CODE_${n}`] = "J";
    params[`FID_INPUT_ISCD_${n}`] = ticker;
  });
  return params;
}

/**
 * 응답 종목 배열을 입력 ticker 순서로 좌조인.
 *
 * `inter_shrn_iscd` 로 매칭 → 없으면 응답 순서(인덱스) fallback. 누락 ticker 는 결과에서 빠진다
 * (BFF/프론트가 store/시드 이름으로 디그레이드 행 렌더). 잉여 응답 항목은 무시.
 */
function joinByTicker(
  tickers: string[],
  output: KisIntstockMultpriceItem[],
): WatchlistQuote[] {
  const byCode = new Map<string, KisIntstockMultpriceItem>();
  for (const item of output) {
    const code = item.inter_shrn_iscd?.trim();
    if (code) byCode.set(code, item);
  }

  const quotes: WatchlistQuote[] = [];
  tickers.forEach((ticker, i) => {
    // 1차: 종목코드 키 매칭. 2차: 코드 키가 비면 응답 순서(인덱스) 정합 가정.
    const item = byCode.get(ticker) ?? (byCode.size === 0 ? output[i] : undefined);
    if (item) quotes.push(mapIntstockMultprice(item, ticker));
  });
  return quotes;
}

/** 배열을 size 단위로 분할. */
function chunk<T>(items: readonly T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
}
