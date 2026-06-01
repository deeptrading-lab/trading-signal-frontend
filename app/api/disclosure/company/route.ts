/**
 * `/api/disclosure/company` BFF route — OpenDART 기업개황 프록시.
 *
 * PRD `stock-api-integration` §3.3.2, AC-1.
 *
 * - GET ?ticker=005930 → 기업개황.
 * - ticker → corp_code 매핑은 `lib/api/kis/search.ts::getCorpCode()` 가 책임.
 * - 시드 누락 ticker → 404 + "ticker 매핑 미존재" 안내.
 * - 환경변수 미설정 / 타임아웃 / quota 초과 시 mock fallback.
 * - 3s 타임아웃 (api-integration-dev 안정성 의무).
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchCompanyProfile } from "@/lib/api/dart/company";
import { isDartConfigured } from "@/lib/api/dart/client";
import {
  incrementDartCounter,
  peekDartCounter,
} from "@/lib/api/dart/counter";
import {
  getCorpCode,
  fetchStockInfo,
  isKisConfigured,
  resolveKisEnv,
} from "@/lib/api/kis";
import { isApiError } from "@/lib/api/errors";
import { getMockCompanyProfile } from "@/lib/mock/disclosure/company";
import {
  withTimeout,
  jsonWithDataSource,
  BFF_TIMEOUT_SENTINEL,
} from "@/lib/server/bffUtils";

const FALLBACK_TIMEOUT_MESSAGE =
  "OpenDART 서버 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.";

export async function GET(request: NextRequest) {
  const ticker = (request.nextUrl.searchParams.get("ticker") ?? "").trim();
  if (!ticker) {
    return NextResponse.json(
      { error: "ticker query parameter 가 필요합니다." },
      { status: 400 },
    );
  }

  // ticker → corp_code 매핑.
  const corpCode = getCorpCode(ticker);
  if (!corpCode) {
    // 시드 누락 — 빈 응답 + 안내.
    return NextResponse.json(
      {
        error:
          "지원 종목 시드에 없는 ticker 입니다. 관리자에게 추가를 요청해 주세요.",
      },
      {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  // 환경변수 미설정 → mock.
  if (!isDartConfigured()) {
    const mock = getMockCompanyProfile(ticker);
    if (!mock) {
      return NextResponse.json(
        { error: "해당 종목의 기업개황 mock 이 없습니다." },
        { status: 404, headers: { "X-Data-Source": "mock" } },
      );
    }
    return jsonWithDataSource(mock, "mock");
  }

  // quota 초과 → mock fallback.
  const quota = peekDartCounter();
  if (quota.isExceeded) {
    const mock = getMockCompanyProfile(ticker);
    if (mock) {
      return jsonWithDataSource(mock, "mock-quota-exceeded");
    }
    return NextResponse.json(
      { error: "OpenDART 일일 호출 한도를 초과했어요. 내일 다시 시도해 주세요." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const status = incrementDartCounter();
    const data = await withTimeout(
      fetchCompanyProfile(ticker, corpCode),
      3_000,
    );
    if (!data) {
      return NextResponse.json(
        { error: "해당 종목의 기업개황을 찾을 수 없어요." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    // 업종 보강(상세) — DART 의 industry 는 induty_code(코드)뿐. KIS 표준산업분류명("통신 및 방송 장비
    //   제조업")으로 덮어 읽기 쉽게 한다(실전 전용, best-effort — 실패/미설정 시 DART 코드 유지).
    //   큰 업종(KRX 섹터 "전기·전자")은 종목 상세 화면이 이미 보유한 price 쿼리(bstp_kor_isnm)에서
    //   클라이언트가 병기한다 → 중복 inquire-price 호출을 피한다(CompanyOverview).
    const industryName = await safeIndustryName(ticker);
    if (industryName) data.industry = industryName;
    const headers: Record<string, string> = { "X-Data-Source": "dart" };
    if (status.isWarn) headers["X-Dart-Quota-Warning"] = "true";
    return jsonWithDataSource(data, "dart", headers);
  } catch (error) {
    return mapErrorToResponse(error, ticker);
  }
}

/**
 * 업종명(표준산업분류명, 상세) best-effort 조회 — KIS `search-stock-info`(실전 전용).
 * 미설정·비-prod·실패·타임아웃이면 undefined(호출 측이 DART induty_code 유지). 기업개황 본 응답을 막지 않는다.
 */
async function safeIndustryName(ticker: string): Promise<string | undefined> {
  if (!isKisConfigured() || resolveKisEnv() !== "prod") return undefined;
  try {
    const info = await withTimeout(fetchStockInfo(ticker), 3_000);
    return info.industryName;
  } catch {
    return undefined;
  }
}

function mapErrorToResponse(error: unknown, ticker: string): NextResponse {
  if (error instanceof Error && error.message === BFF_TIMEOUT_SENTINEL) {
    const mock = getMockCompanyProfile(ticker);
    if (mock) {
      return jsonWithDataSource(mock, "mock-timeout", {
        "X-Error": FALLBACK_TIMEOUT_MESSAGE,
      });
    }
    return NextResponse.json(
      { error: FALLBACK_TIMEOUT_MESSAGE },
      { status: 504, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (isApiError(error)) {
    return NextResponse.json(
      { error: error.message, detail: error.detail },
      {
        status: error.status && error.status >= 400 ? error.status : 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  return NextResponse.json(
    { error: "OpenDART 서버 일시 오류. 잠시 후 다시 시도해주세요." },
    { status: 502, headers: { "Cache-Control": "no-store" } },
  );
}
