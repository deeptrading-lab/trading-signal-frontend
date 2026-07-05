/**
 * `/api/market/fluctuation` BFF route — 등락률 순위 급상승(`?dir=up`)/급하락(`?dir=down`).
 *
 * 브라우저 → 본 route handler → KIS REST 단방향(AGENTS.md BFF 원칙). volume-rank 와 동일한 안전 장치:
 *   - **이중 게이트** — `isKisConfigured()` AND `resolveKisEnv()==="prod"` 일 때만 실호출
 *     (TR `FHPST01700000` 은 실전 전용·모의 미지원) → 미충족 시 mock.
 *   - `withTimeout` + transient 1회 재시도(EGW00201 초당 한도 보호), 타임아웃 → mock-timeout.
 *   - **never-throw** — 키 없음/KIS 오류/빈 결과 어떤 경우도 브라우저에 5xx 를 주지 않고 mock 으로 폴백
 *     (친구 로컬 무키 환경이 항상 렌더되게). `X-Data-Source`(kis/mock/mock-empty/mock-error/mock-timeout).
 *   - `X-KIS-Env` 헤더 + `Cache-Control: no-store`.
 */

import { isKisConfigured, resolveKisEnv } from "@/lib/api/kis";
import { fetchFluctuation } from "@/lib/api/kis/fluctuation";
import { enrichRankingRows } from "@/lib/api/kis/rankingEnrich";
import { getMockFluctuation } from "@/lib/mock/market/fluctuation";
import { isRegularStock } from "@/lib/server/rankingFilter";
import type {
  FluctuationDirection,
  FluctuationResponse,
} from "@/lib/types/market/fluctuation";
import {
  withTimeout,
  jsonWithDataSource,
  fetchWithTransientRetryOrThrow,
  BFF_TIMEOUT_SENTINEL,
} from "@/lib/server/bffUtils";
import type { NextRequest } from "next/server";

const BFF_TIMEOUT_MS = 8_000;
const RETRY_BACKOFF_MS = 250;
const TOP_N = 14;

const FALLBACK_TIMEOUT_MESSAGE = "KIS 서버 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.";
const FALLBACK_SERVER_MESSAGE = "등락률 순위를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";

/** `?dir=up|down` 검증 — 그 외/누락은 up(급상승) 기본. */
function resolveDirection(request: NextRequest): FluctuationDirection {
  return request.nextUrl.searchParams.get("dir") === "down" ? "down" : "up";
}

export async function GET(request: NextRequest) {
  const direction = resolveDirection(request);

  // 이중 게이트 — 실전 전용 TR 이므로 미충족 시 KIS 실호출 없이 mock.
  if (!isKisConfigured() || resolveKisEnv() !== "prod") {
    return jsonWithDataSource(getMockFluctuation(direction), "mock", {
      "X-KIS-Env": resolveKisEnv(),
    });
  }

  try {
    const fetched = await withTimeout(
      fetchWithTransientRetryOrThrow(
        () => fetchFluctuation(direction),
        RETRY_BACKOFF_MS,
      ),
      BFF_TIMEOUT_MS,
    );
    const rows = fetched.filter(isRegularStock).slice(0, TOP_N);
    if (rows.length === 0) {
      // 전량 필터링/빈 결과 → 502 대신 mock 으로 fail-soft(무키 로컬과 동일 UX).
      return jsonWithDataSource(getMockFluctuation(direction), "mock-empty", {
        "X-KIS-Env": resolveKisEnv(),
      });
    }
    // 시총(토스)·산업(KIS) best-effort enrich — never-block(실패·예산초과 시 컬럼만 빈값, 랭킹 무붕괴).
    const enriched = await enrichRankingRows(rows);
    const result: FluctuationResponse = {
      rows: enriched,
      direction,
      asOf: new Date().toISOString(),
    };
    return jsonWithDataSource(result, "kis", { "X-KIS-Env": resolveKisEnv() });
  } catch (error) {
    // never-throw — 타임아웃/KIS 비즈니스 오류/네트워크 모두 mock 으로 폴백(브라우저 5xx 0건).
    if (error instanceof Error && error.message === BFF_TIMEOUT_SENTINEL) {
      return jsonWithDataSource(getMockFluctuation(direction), "mock-timeout", {
        "X-Error": FALLBACK_TIMEOUT_MESSAGE,
        "X-KIS-Env": resolveKisEnv(),
      });
    }
    return jsonWithDataSource(getMockFluctuation(direction), "mock-error", {
      "X-Error": FALLBACK_SERVER_MESSAGE,
      "X-KIS-Env": resolveKisEnv(),
    });
  }
}
