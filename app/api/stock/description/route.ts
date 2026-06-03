/**
 * `/api/stock/description` BFF route — 종목 "회사 소개"(자유 텍스트) 프록시.
 *
 * 출처 비교·결정: `docs/research/company-description-sources.md` (B = FnGuide/wisereport 채택).
 *
 * - GET ?ticker=005930 → `CompanyDescription`(문장 배열 + 출처 라벨).
 * - 출처(wisereport)는 비공식 + FnGuide 콘텐츠(ToS 회색지대) → **kill-switch** 존재:
 *     `COMPANY_DESC_SOURCE=off` 면 외부 호출 생략하고 mock/빈 응답으로 degrade.
 * - 비핵심 정보라 실패해도 화면을 막지 않는다: 차단/타임아웃/미발견 → mock → 빈 배열(200).
 *   UI(`CompanyOverview`)는 `sentences` 가 비면 블록 자체를 숨긴다.
 * - 3s 타임아웃(api-integration-dev 안정성 의무) — 외부 client AbortSignal + 라우트 withTimeout 이중.
 */

import { NextRequest } from "next/server";
import { fetchCompanySummary } from "@/lib/api/external/companySummary";
import { getMockCompanyDescription } from "@/lib/mock/stock/description";
import { withTimeout, jsonWithDataSource } from "@/lib/server/bffUtils";
import type { CompanyDescription } from "@/lib/types/stock/description";

const TIMEOUT_MS = 3_000;
const TICKER_RE = /^\d{6}$/;

export async function GET(request: NextRequest) {
  const ticker = (request.nextUrl.searchParams.get("ticker") ?? "").trim();
  if (!TICKER_RE.test(ticker)) {
    return jsonWithDataSource(empty(ticker), "empty");
  }

  // kill-switch — 외부 출처 비활성 시 mock/빈 응답.
  if (process.env.COMPANY_DESC_SOURCE === "off") {
    return jsonWithDataSource(getMockCompanyDescription(ticker), "mock");
  }

  try {
    const sentences = await withTimeout(fetchCompanySummary(ticker), TIMEOUT_MS);
    if (sentences.length > 0) {
      const data: CompanyDescription = { ticker, sentences, source: "FnGuide" };
      return jsonWithDataSource(data, "wisereport");
    }
  } catch {
    // 타임아웃/네트워크 → 아래 mock/빈 폴백.
  }

  // 미발견·실패 → mock(시드 있으면) → 빈 배열. 어느 쪽이든 200(UI 가 빈 배열이면 숨김).
  const mock = getMockCompanyDescription(ticker);
  return jsonWithDataSource(mock, mock.sentences.length > 0 ? "mock" : "empty");
}

function empty(ticker: string): CompanyDescription {
  return { ticker, sentences: [], source: "" };
}
