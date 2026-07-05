/**
 * `/api/market/sparklines?tickers=a,b,c` BFF route — 여러 종목의 스파크라인 종가를 **배치**로 반환.
 *
 * 구성종목 모달이 행마다 개별 차트 API 를 부르지 않고, 이 한 번의 배치 요청으로 전 종목 스파크라인을
 * 받아 **일괄** 렌더한다(빈 네모·순차 없음). 브라우저 → route handler → KIS 단방향(BFF 원칙).
 *   - **이중 게이트** — `isKisConfigured()` AND `resolveKisEnv()==="prod"` 일 때만 실호출 → 미충족 mock.
 *   - `withTimeout` + never-throw — 타임아웃/오류는 빈 맵(fail-soft, 모달은 스파크라인 없이 렌더).
 *   - 티커 상한(캡)으로 과도 fan-out 방지. `Cache-Control: no-store`.
 */

import { NextResponse, type NextRequest } from "next/server";
import { isKisConfigured, resolveKisEnv } from "@/lib/api/kis";
import { loadSparklines } from "@/lib/api/kis/sectorSparklines";
import { getMockSparklines } from "@/lib/mock/market/sectors";
import type { SectorSparklinesResponse } from "@/lib/types/market/sectors";
import { withTimeout, BFF_TIMEOUT_SENTINEL } from "@/lib/server/bffUtils";

const BFF_TIMEOUT_MS = 10_000;
/** 배치 티커 상한 — 구성종목 top-30 + 여유. 과도 fan-out 방지. */
const MAX_TICKERS = 40;
/** 티커 형식(6자리 숫자 or 영숫자 심볼) — 잡음 차단. */
const TICKER_RE = /^[A-Za-z0-9]{1,20}$/;

function parseTickers(request: NextRequest): string[] {
  const raw = request.nextUrl.searchParams.get("tickers") ?? "";
  return [
    ...new Set(
      raw
        .split(",")
        .map((t) => t.trim())
        .filter((t) => TICKER_RE.test(t)),
    ),
  ].slice(0, MAX_TICKERS);
}

export async function GET(request: NextRequest) {
  const tickers = parseTickers(request);
  const headers = { "Cache-Control": "no-store", "X-KIS-Env": resolveKisEnv() };

  if (tickers.length === 0) {
    return NextResponse.json({ sparklines: {} } satisfies SectorSparklinesResponse, {
      headers,
    });
  }

  // 이중 게이트 — 미충족 시 KIS 실호출 없이 mock(로컬/무키 demo).
  if (!isKisConfigured() || resolveKisEnv() !== "prod") {
    return NextResponse.json(
      { sparklines: getMockSparklines(tickers) } satisfies SectorSparklinesResponse,
      { headers },
    );
  }

  try {
    const sparklines = await withTimeout(loadSparklines(tickers), BFF_TIMEOUT_MS);
    return NextResponse.json({ sparklines } satisfies SectorSparklinesResponse, {
      headers,
    });
  } catch (error) {
    // never-throw — 타임아웃/오류는 빈 맵(모달은 스파크라인 없이 정상 렌더).
    void (error instanceof Error && error.message === BFF_TIMEOUT_SENTINEL);
    return NextResponse.json({ sparklines: {} } satisfies SectorSparklinesResponse, {
      headers,
    });
  }
}
