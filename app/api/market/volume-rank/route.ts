/**
 * `/api/market/volume-rank` BFF route — 거래량 순위 상위 종목(단타워치 후보 추천).
 *
 * 브라우저 → 본 route handler → KIS REST 단방향(AGENTS.md BFF 원칙).
 * flow/top10 과 동일한 안전 장치:
 *   - **이중 게이트** — `isKisConfigured()` AND `resolveKisEnv()==="prod"` 일 때만 실호출
 *     (TR `FHPST01710000` 은 실전 전용·모의 미지원) → 미충족 시 mock.
 *   - `withTimeout` + transient 1회 재시도, 타임아웃 → mock-timeout fallback.
 *   - `X-Data-Source`(kis/mock/mock-timeout) 헤더 + `Cache-Control: no-store`.
 */

import { NextResponse } from "next/server";
import { isKisConfigured, resolveKisEnv } from "@/lib/api/kis";
import { fetchVolumeRank } from "@/lib/api/kis/volume-rank";
import { isApiError } from "@/lib/api/errors";
import { getMockVolumeRank } from "@/lib/mock/market/volumeRank";
import type { VolumeRankResponse } from "@/lib/types/market/volumeRank";
import {
  withTimeout,
  jsonWithDataSource,
  fetchWithTransientRetryOrThrow,
  BFF_TIMEOUT_SENTINEL,
} from "@/lib/server/bffUtils";

const BFF_TIMEOUT_MS = 8_000;
const RETRY_BACKOFF_MS = 250;
const TOP_N = 14;

/**
 * ETF·ETN 제외 휴리스틱 — KIS `FID_DIV_CLS_CODE=1`(보통주)로도 ETP 가 걸러지지 않아(실측:
 * 인버스 ETF·ETN 이 상위 도배) 이름·코드로 2차 필터. 단타 후보는 개별 종목이 목적.
 * 코드: 정규 6자리 숫자만(ETN 은 Q 접두 등 비정형). 이름: 대표 ETP 브랜드·파생 키워드.
 */
const ETP_NAME_RE =
  /(ETN|ETF|KODEX|TIGER|KBSTAR|RISE|SOL|ACE|PLUS|HANARO|ARIRANG|레버리지|인버스|선물|콜|풋)/i;

function isRegularStock(row: { ticker: string; name: string }): boolean {
  return /^\d{6}$/.test(row.ticker) && !ETP_NAME_RE.test(row.name);
}

const FALLBACK_TIMEOUT_MESSAGE = "KIS 서버 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.";
const FALLBACK_SERVER_MESSAGE = "거래량 순위를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";

export async function GET() {
  // 이중 게이트 — 실전 전용 TR 이므로 미충족 시 KIS 실호출 없이 mock.
  if (!isKisConfigured() || resolveKisEnv() !== "prod") {
    return jsonWithDataSource(getMockVolumeRank(), "mock", {
      "X-KIS-Env": resolveKisEnv(),
    });
  }

  try {
    // throw 전파 변형 사용(리뷰 #8) — 빈 배열 폴백은 KIS 비즈니스 오류(토큰 만료·레이트리밋)를
    // 삼켜 아래 isApiError 분기를 죽은 코드로 만들고 원인 없는 generic 502 만 남긴다.
    const fetched = await withTimeout(
      fetchWithTransientRetryOrThrow(() => fetchVolumeRank(), RETRY_BACKOFF_MS),
      BFF_TIMEOUT_MS,
    );
    const rows = fetched.filter(isRegularStock);
    if (rows.length === 0) {
      return NextResponse.json(
        { error: FALLBACK_SERVER_MESSAGE },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
    const result: VolumeRankResponse = {
      rows: rows.slice(0, TOP_N),
      asOf: new Date().toISOString(),
    };
    return jsonWithDataSource(result, "kis", { "X-KIS-Env": resolveKisEnv() });
  } catch (error) {
    if (error instanceof Error && error.message === BFF_TIMEOUT_SENTINEL) {
      return jsonWithDataSource(getMockVolumeRank(), "mock-timeout", {
        "X-Error": FALLBACK_TIMEOUT_MESSAGE,
        "X-KIS-Env": resolveKisEnv(),
      });
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
      { error: FALLBACK_SERVER_MESSAGE },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
