/**
 * `/api/disclosure/list` BFF route — OpenDART 공시 목록 프록시.
 *
 * PRD `stock-api-integration` §3.3.2, AC-1.
 *
 * - GET ?ticker=005930&count=5 → 최근 N건.
 * - count 기본값 5, 최대 100.
 * - ticker → corp_code 매핑 / mock fallback / quota 초과 처리는 company route 와 동일 패턴.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchDisclosureList } from "@/lib/api/dart/disclosure";
import { isDartConfigured } from "@/lib/api/dart/client";
import {
  incrementDartCounter,
  peekDartCounter,
} from "@/lib/api/dart/counter";
import { getCorpCode } from "@/lib/api/kis";
import { isApiError } from "@/lib/api/errors";
import { getMockDisclosureList } from "@/lib/mock/disclosure/list";

const FALLBACK_TIMEOUT_MESSAGE =
  "OpenDART 서버 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.";

export async function GET(request: NextRequest) {
  const ticker = (request.nextUrl.searchParams.get("ticker") ?? "").trim();
  const rawCount = request.nextUrl.searchParams.get("count");
  const count = rawCount ? Math.max(1, Math.min(100, Number(rawCount) || 5)) : 5;

  if (!ticker) {
    return NextResponse.json(
      { error: "ticker query parameter 가 필요합니다." },
      { status: 400 },
    );
  }

  const corpCode = getCorpCode(ticker);
  if (!corpCode) {
    return NextResponse.json(
      {
        error:
          "지원 종목 시드에 없는 ticker 입니다. 관리자에게 추가를 요청해 주세요.",
      },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!isDartConfigured()) {
    return jsonWithDataSource(getMockDisclosureList(ticker, count), "mock");
  }

  const quota = peekDartCounter();
  if (quota.isExceeded) {
    return jsonWithDataSource(
      getMockDisclosureList(ticker, count),
      "mock-quota-exceeded",
    );
  }

  try {
    const status = incrementDartCounter();
    const data = await withTimeout(
      fetchDisclosureList(corpCode, count),
      3_000,
    );
    const headers: Record<string, string> = { "X-Data-Source": "dart" };
    if (status.isWarn) headers["X-Dart-Quota-Warning"] = "true";
    return jsonWithDataSource(data, "dart", headers);
  } catch (error) {
    return mapErrorToResponse(error, ticker, count);
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

function mapErrorToResponse(
  error: unknown,
  ticker: string,
  count: number,
): NextResponse {
  if (error instanceof Error && error.message === "__BFF_TIMEOUT__") {
    return jsonWithDataSource(
      getMockDisclosureList(ticker, count),
      "mock-timeout",
      { "X-Error": FALLBACK_TIMEOUT_MESSAGE },
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
