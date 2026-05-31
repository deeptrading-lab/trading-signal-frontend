/**
 * OpenDART 기업개황 조회 (`/api/company.json`).
 *
 * PRD `stock-api-integration` §3.2.
 *
 * 입력: 8자리 corp_code (ticker 가 아님 — `lib/api/kis/search.ts::getCorpCode()` 로 매핑).
 * 출력: 클라이언트 친화 `CompanyProfile`.
 */

import { getDartApiKey, getDartClient } from "./client";
import {
  isDartEmptyStatus,
  isDartQuotaExceededStatus,
  makeDartBusinessError,
  makeDartTransportError,
} from "./errors";
import type { CompanyProfile, DartCompanyResponse } from "./types";

/**
 * corp_code → 기업개황. 빈 결과는 null.
 *
 * ticker 인수는 클라이언트 친화 응답의 ticker 필드 채우기용. corp_code 와 ticker 가 불일치하면
 * 호출 측이 책임 (`lib/api/kis/search.ts::getCorpCode(ticker)` 로 매핑하면 정합 보장).
 */
export async function fetchCompanyProfile(
  ticker: string,
  corpCode: string,
): Promise<CompanyProfile | null> {
  const client = getDartClient();
  const apiKey = getDartApiKey();
  if (!apiKey) {
    throw makeDartTransportError({
      message: "OPENDART_API_KEY 환경변수가 설정되지 않았습니다.",
    });
  }

  let response;
  try {
    response = await client.get<DartCompanyResponse>("/company.json", {
      params: {
        crtfc_key: apiKey,
        corp_code: corpCode,
      },
    });
  } catch (error) {
    const status =
      typeof (error as { response?: { status?: number } }).response?.status ===
      "number"
        ? (error as { response: { status: number } }).response.status
        : undefined;
    throw makeDartTransportError({
      status,
      message: status
        ? "OpenDART 서버 오류가 발생했어요. 잠시 후 다시 시도해주세요."
        : "OpenDART 서버와 연결할 수 없어요. 잠시 후 다시 시도해주세요.",
    });
  }

  const data = response.data;
  if (data.status !== "000") {
    if (isDartEmptyStatus(data.status)) return null;
    if (isDartQuotaExceededStatus(data.status)) {
      // BFF route 가 mock fallback 분기 — 비즈니스 에러로 그대로 throw.
    }
    throw makeDartBusinessError(data.status, data.message);
  }

  return {
    ticker,
    corpName: data.corp_name?.trim() ?? "",
    ceoName: data.ceo_nm?.trim() ?? "",
    market: mapCorpCls(data.corp_cls),
    establishedDate: formatDate(data.est_dt),
    industry: data.induty_code?.trim(),
    homepage: data.hm_url?.trim() || undefined,
    address: data.adres?.trim() || undefined,
  };
}

function mapCorpCls(cls: string | undefined): CompanyProfile["market"] {
  switch (cls) {
    case "Y":
      return "KOSPI";
    case "K":
      return "KOSDAQ";
    case "N":
      return "KONEX";
    default:
      return "OTHER";
  }
}

function formatDate(yyyymmdd: string | undefined): string | undefined {
  if (!yyyymmdd) return undefined;
  if (/^\d{8}$/.test(yyyymmdd)) {
    return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
  }
  return yyyymmdd;
}
