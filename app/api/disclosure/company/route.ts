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
import { getCorpCode } from "@/lib/api/kis";
import { isApiError } from "@/lib/api/errors";
import { getMockCompanyProfile } from "@/lib/mock/disclosure/company";

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
    const headers: Record<string, string> = { "X-Data-Source": "dart" };
    if (status.isWarn) headers["X-Dart-Quota-Warning"] = "true";
    return jsonWithDataSource(data, "dart", headers);
  } catch (error) {
    return mapErrorToResponse(error, ticker);
  }
}

function jsonWithDataSource(
  data: unknown,
  source: string,
  extraHeaders?: Record<string, string>,
): NextResponse {
  return NextResponse.json(data, {
    status: 200,
    headers: {
      "X-Data-Source": source,
      "Cache-Control": "no-store",
      ...(extraHeaders ?? {}),
    },
  });
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("__BFF_TIMEOUT__")), ms);
  });
  try {
    return (await Promise.race([promise, timeout])) as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function mapErrorToResponse(error: unknown, ticker: string): NextResponse {
  if (error instanceof Error && error.message === "__BFF_TIMEOUT__") {
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
