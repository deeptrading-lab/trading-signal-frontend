/**
 * `/api/stock/search` BFF route — symbols.json 기반 종목 검색.
 *
 * PRD `stock-api-integration` §3.3.1, §9 q3·q7 [RESOLVED]:
 *   - 본 PR-A 는 KIS 검색 API 미사용. `lib/api/kis/search.ts` 의 substring 검색만.
 *   - 환경변수 무관 — symbols.json 은 클라이언트 사이드 데이터.
 *   - 후속 PR 에서 KIS 검색 API 또는 Fuse.js 도입 가능 (시그니처 유지).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getSymbolsMeta,
  isKisConfigured,
  searchSymbols,
} from "@/lib/api/kis";
import { getMockStockSearch } from "@/lib/mock/stock/search";

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get("keyword") ?? "";

  // symbols.json 기반은 환경변수 무관하게 동작 가능. 다만 KIS 미설정 시 일관성 위해 mock 헤더로 표시.
  if (!isKisConfigured()) {
    return NextResponse.json(getMockStockSearch(keyword), {
      status: 200,
      headers: {
        "X-Data-Source": "mock",
        "Cache-Control": "no-store",
      },
    });
  }

  const meta = getSymbolsMeta();
  return NextResponse.json(searchSymbols(keyword), {
    status: 200,
    headers: {
      "X-Data-Source": "seed",
      "X-Symbols-Version": meta.version,
      "X-Symbols-Count": String(meta.count),
      "Cache-Control": "no-store",
    },
  });
}
