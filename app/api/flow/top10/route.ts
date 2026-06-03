/**
 * `/api/flow/top10` BFF route — 표면 A 시장 전체 외국인/기관 당일 순매수 Top10.
 *
 * 브라우저 → 본 route handler → KIS REST 단방향. 직접 호출 금지 (AGENTS.md BFF 원칙).
 *
 * PRD `investor-flow` §4.A / §6.1 / §6.3:
 *   - **이중 게이트** — `isKisConfigured()` AND `resolveKisEnv()==="prod"` 통과 시에만 KIS 실호출.
 *     수급 랭킹은 실전 전용 가능성↑ + `FID_INPUT_ISCD=0000` 합산동작 미검증 → 미충족 시 mock.
 *   - **주체별 2콜** — `fetchForeignInstitutionTotal("frgn")` + `("orgn")` 를 순차(delay)로 호출해
 *     EGW00201(초당 거래건수) 회피. 동시 난사 제거(indices/ticker route 패턴 정합).
 *   - 각 랭킹 상위 10 slice → `{foreign,institution,asOf}` 반환.
 *   - `withTimeout`·`jsonWithDataSource`·`BFF_TIMEOUT_SENTINEL`·`delay` 재사용(`bffUtils`).
 *   - 타임아웃 → mock-timeout fallback + 한글 안내, 전체 실패 → 한글 502, `Cache-Control: no-store`.
 *   - `X-Data-Source`(kis/mock/mock-timeout) + `X-KIS-Env` 헤더.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  fetchForeignInstitutionTotal,
  isKisConfigured,
  resolveKisEnv,
} from "@/lib/api/kis";
import { isApiError } from "@/lib/api/errors";
import { getMockInvestorFlowTop10 } from "@/lib/mock/flow/top10";
import { getMockInvestorFlowCumulative } from "@/lib/mock/flow/cumulative";
import { readCumulativeSnapshots } from "@/lib/server/flowSnapshotStore";
import type {
  InvestorFlowRow,
  InvestorFlowTop10,
} from "@/lib/types/flow/top10";
import {
  withTimeout,
  delay,
  jsonWithDataSource,
  fetchWithTransientRetry,
  BFF_TIMEOUT_SENTINEL,
} from "@/lib/server/bffUtils";

const BFF_TIMEOUT_MS = 8_000; // 주체 2콜(+재시도) 순차 + 지연 여유.
const SUBJECT_DELAY_MS = 150; // 주체 간 짧은 지연 — EGW00201 회피(ticker route 정합).
const RETRY_BACKOFF_MS = 250; // transient(EGW00201/네트워크) 1회 재시도 backoff.
const TOP_N = 10;

const FALLBACK_TIMEOUT_MESSAGE =
  "KIS 서버 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.";
const FALLBACK_SERVER_MESSAGE =
  "외국인·기관 순매수 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";

const CUMULATIVE_MAX_DAYS = 7;

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("mode");
  if (mode === "cumulative") {
    const daysParam = Number.parseInt(
      request.nextUrl.searchParams.get("days") ?? "7",
      10,
    );
    const days = Number.isFinite(daysParam)
      ? Math.min(Math.max(daysParam, 1), CUMULATIVE_MAX_DAYS)
      : CUMULATIVE_MAX_DAYS;
    return handleCumulative(days);
  }

  // === 당일(today) — 기존 동작(무회귀) ===
  // 이중 게이트 — 미설정 또는 prod 가 아니면 KIS 실호출을 시도하지 않고 mock.
  if (!isKisConfigured() || resolveKisEnv() !== "prod") {
    return jsonWithDataSource(getMockInvestorFlowTop10(), "mock", {
      "X-KIS-Env": resolveKisEnv(),
    });
  }

  try {
    const result = await withTimeout(fetchTop10(), BFF_TIMEOUT_MS);
    // 양 주체 전부 비면 비즈니스/네트워크 실패로 간주.
    if (result.foreign.length === 0 && result.institution.length === 0) {
      return mapErrorToResponse(new Error("__ALL_FAILED__"));
    }
    return jsonWithDataSource(result, "kis", {
      "X-KIS-Env": resolveKisEnv(),
    });
  } catch (error) {
    return mapErrorToResponse(error);
  }
}

/**
 * 외국인·기관 주체별 1콜씩 순차 호출(delay 로 EGW00201 회피) → 각 상위 10 slice 후 합성.
 * 한 주체 실패는 빈 배열로 degrade(부분 성공 — 다른 주체는 노출).
 */
async function fetchTop10(): Promise<InvestorFlowTop10> {
  const foreign = await safeFetch("frgn");
  await delay(SUBJECT_DELAY_MS);
  const institution = await safeFetch("orgn");

  return {
    foreign: foreign.slice(0, TOP_N),
    institution: institution.slice(0, TOP_N),
    asOf: new Date().toISOString(),
  };
}

/**
 * 단일 주체 호출 — transient(EGW00201/네트워크) 시 backoff 후 1회 재시도, 실패 시 빈 배열 degrade.
 * 홈 진입 시 다른 KIS 위젯과 동시 호출이 겹쳐 초당 한도에 걸려 빈 컬럼이 되던 문제 방어(#90).
 * BFF 타임아웃 sentinel 은 상위로 전파(mock-timeout 분기). 공통 헬퍼 `fetchWithTransientRetry` 사용.
 */
async function safeFetch(
  subject: "frgn" | "orgn",
): Promise<InvestorFlowRow[]> {
  return fetchWithTransientRetry(
    () => fetchForeignInstitutionTotal(subject),
    [],
    RETRY_BACKOFF_MS,
  );
}

/**
 * 누적 모드 — 최근 N영업일 스냅샷(KV, cron 적립)을 합산해 Top10.
 * - 비-prod(로컬/preview): KV 미적립이 일반적 → mock 누적(레이아웃·토글 demo).
 * - prod: KV 합산. 적립 전이면 `cumulativeDays=0` 으로 반환(UI 가 "모으는 중" 안내).
 */
async function handleCumulative(days: number): Promise<NextResponse> {
  if (!isKisConfigured() || resolveKisEnv() !== "prod") {
    return jsonWithDataSource(getMockInvestorFlowCumulative(days), "mock", {
      "X-KIS-Env": resolveKisEnv(),
    });
  }
  try {
    const foreign = await readCumulativeSnapshots("frgn", days);
    const institution = await readCumulativeSnapshots("orgn", days);
    const result: InvestorFlowTop10 = {
      foreign: foreign.rows.slice(0, TOP_N),
      institution: institution.rows.slice(0, TOP_N),
      cumulativeDays: Math.max(foreign.daysCount, institution.daysCount),
    };
    return jsonWithDataSource(result, "kv", { "X-KIS-Env": resolveKisEnv() });
  } catch {
    // KV 장애 등 — 누적 mock 으로 degrade(당일 모드는 별개라 무영향).
    return jsonWithDataSource(getMockInvestorFlowCumulative(days), "mock", {
      "X-KIS-Env": resolveKisEnv(),
    });
  }
}

function mapErrorToResponse(error: unknown): NextResponse {
  // 타임아웃 → mock fallback (graceful degrade) + 한글 안내.
  if (error instanceof Error && error.message === BFF_TIMEOUT_SENTINEL) {
    return jsonWithDataSource(getMockInvestorFlowTop10(), "mock-timeout", {
      "X-Error": FALLBACK_TIMEOUT_MESSAGE,
      "X-KIS-Env": resolveKisEnv(),
    });
  }

  // 전부 실패 → 한글 fallback (mock 노출 대신 명시적 에러로 화면 분기 가능).
  if (error instanceof Error && error.message === "__ALL_FAILED__") {
    return NextResponse.json(
      { error: FALLBACK_SERVER_MESSAGE },
      { status: 502, headers: { "Cache-Control": "no-store" } },
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
    { error: FALLBACK_SERVER_MESSAGE },
    { status: 502, headers: { "Cache-Control": "no-store" } },
  );
}
