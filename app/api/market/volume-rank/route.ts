/**
 * `/api/market/volume-rank` BFF route — 거래량/거래대금 순위 상위 종목(단타워치 후보 추천).
 *
 * 브라우저 → 본 route handler → KIS REST 단방향(AGENTS.md BFF 원칙).
 * flow/top10 과 동일한 안전 장치:
 *   - **이중 게이트** — `isKisConfigured()` AND `resolveKisEnv()==="prod"` 일 때만 실호출
 *     (TR `FHPST01710000` 은 실전 전용·모의 미지원) → 미충족 시 mock.
 *   - `withTimeout` + transient 1회 재시도, 타임아웃 → mock-timeout fallback.
 *   - `?by=volume|value` — 정렬 기준(거래량순 기본 / 거래대금순). 미지정/그 외는 volume.
 *   - `X-Data-Source`(kis/mock/mock-timeout) 헤더 + `Cache-Control: no-store`.
 */

import { NextResponse, type NextRequest } from "next/server";
import { isKisConfigured, resolveKisEnv } from "@/lib/api/kis";
import { fetchVolumeRank } from "@/lib/api/kis/volume-rank";
import { isApiError } from "@/lib/api/errors";
import { getMockVolumeRank } from "@/lib/mock/market/volumeRank";
import { isRegularStock } from "@/lib/server/rankingFilter";
import type {
  VolumeRankBy,
  VolumeRankResponse,
} from "@/lib/types/market/volumeRank";
import {
  withTimeout,
  jsonWithDataSource,
  fetchWithTransientRetryOrThrow,
  BFF_TIMEOUT_SENTINEL,
} from "@/lib/server/bffUtils";

const BFF_TIMEOUT_MS = 8_000;
const RETRY_BACKOFF_MS = 250;
const TOP_N = 14;

const FALLBACK_TIMEOUT_MESSAGE = "KIS 서버 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.";
const FALLBACK_SERVER_MESSAGE = "거래량 순위를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";

/** `?by=volume|value` 검증 — 그 외/누락은 volume(거래량순) 기본(무회귀). */
function resolveBy(request: NextRequest): VolumeRankBy {
  return request.nextUrl.searchParams.get("by") === "value" ? "value" : "volume";
}

export async function GET(request: NextRequest) {
  const by = resolveBy(request);

  // 이중 게이트 — 실전 전용 TR 이므로 미충족 시 KIS 실호출 없이 mock.
  if (!isKisConfigured() || resolveKisEnv() !== "prod") {
    return jsonWithDataSource(getMockVolumeRank(by), "mock", {
      "X-KIS-Env": resolveKisEnv(),
    });
  }

  try {
    // throw 전파 변형 사용(리뷰 #8) — 빈 배열 폴백은 KIS 비즈니스 오류(토큰 만료·레이트리밋)를
    // 삼켜 아래 isApiError 분기를 죽은 코드로 만들고 원인 없는 generic 502 만 남긴다.
    const fetched = await withTimeout(
      fetchWithTransientRetryOrThrow(() => fetchVolumeRank(by), RETRY_BACKOFF_MS),
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
      return jsonWithDataSource(getMockVolumeRank(by), "mock-timeout", {
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
