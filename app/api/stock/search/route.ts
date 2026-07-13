/**
 * `/api/stock/search` BFF route — 종목 검색(시드 인덱스 **서버** 검색).
 *
 * 배경(mobile-perf-bundle): 이전에는 클라이언트가 검색 시드(국내 `symbols.json` 329KB +
 * 미국 `us-symbols.json` 1.7MB)를 동적 import 해 직접 검색했다. 모바일에서 2MB JSON
 * 다운로드+파싱+힙 상주가 페이지 이동 지연·탭 킬(메모리 부하 재시작)에 기여해, 검색을
 * 서버로 옮기고 시드를 클라 번들에서 완전히 제거한다.
 *
 * - GET ?q=삼성전자 → `StockSearchResult[]` — 검색 정책은 기존 `searchSymbols` 그대로
 *   (6자리 티커 정확 매칭 · 한글 별칭 · 관련도 랭킹 · 최대 20건).
 * - 시드는 배포 단위 정적(외부 API 호출 0) → 타임아웃 가드 불요, `Cache-Control` 로
 *   동일 질의 재호출을 CDN/브라우저에서 흡수(배포 시 CDN 캐시 자동 purge).
 * - `X-Symbols-Source` — 시드 버전 관측성(기존 `getSymbolsMeta` 컨벤션).
 */

import { NextRequest, NextResponse } from "next/server";
import { searchSymbols, getSymbolsMeta } from "@/lib/api/kis";

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) {
    return NextResponse.json(
      { error: "q query parameter 가 필요합니다." },
      { status: 400 },
    );
  }

  const meta = getSymbolsMeta();
  return NextResponse.json(searchSymbols(q), {
    headers: {
      "X-Symbols-Source": `seed-v${meta.version}`,
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}
