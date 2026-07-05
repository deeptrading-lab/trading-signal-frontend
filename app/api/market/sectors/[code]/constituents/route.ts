/**
 * `/api/market/sectors/[code]/constituents` BFF route — 업종 구성종목(대표/급등 top-30).
 *
 * 브라우저 → 본 route handler → KIS REST 단방향(AGENTS.md BFF 원칙). sectors 리스트와 동일한 안전 장치:
 *   - **이중 게이트** — `isKisConfigured()` AND `resolveKisEnv()==="prod"` 일 때만 실호출
 *     (TR `FHPST01700000` 은 실전 전용·모의 미지원) → 미충족 시 mock.
 *   - `withTimeout` + transient 1회 재시도 → 타임아웃 mock-timeout, 기타 오류 mock-error(never-throw).
 *   - `code` 형식(4자리 숫자) 검증 실패 400. `X-Data-Source`/`X-KIS-Env` + `Cache-Control: no-store`.
 */

import { NextResponse, type NextRequest } from "next/server";
import { isKisConfigured, resolveKisEnv } from "@/lib/api/kis";
import { fetchSectorConstituents } from "@/lib/api/kis/sectorConstituents";
import { getMockSectorConstituents } from "@/lib/mock/market/sectors";
import type { SectorConstituentsResponse } from "@/lib/types/market/sectors";
import {
  withTimeout,
  jsonWithDataSource,
  fetchWithTransientRetryOrThrow,
  BFF_TIMEOUT_SENTINEL,
} from "@/lib/server/bffUtils";

const BFF_TIMEOUT_MS = 10_000; // 시총 enrich(토스 마스터 배치) 포함이라 여유.
const RETRY_BACKOFF_MS = 250;

const FALLBACK_TIMEOUT_MESSAGE = "KIS 서버 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.";
const FALLBACK_SERVER_MESSAGE = "구성종목을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";

/** 업종 코드 형식(4자리 숫자) 검증. */
function isValidSectorCode(code: string): boolean {
  return /^\d{4}$/.test(code);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  if (!isValidSectorCode(code)) {
    return NextResponse.json(
      { error: "업종 코드 형식이 올바르지 않아요." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  // 이중 게이트 — 실전 전용 TR 이므로 미충족 시 KIS 실호출 없이 mock.
  if (!isKisConfigured() || resolveKisEnv() !== "prod") {
    return jsonWithDataSource(getMockSectorConstituents(code), "mock", {
      "X-KIS-Env": resolveKisEnv(),
    });
  }

  try {
    const constituents = await withTimeout(
      fetchWithTransientRetryOrThrow(
        () => fetchSectorConstituents(code),
        RETRY_BACKOFF_MS,
      ),
      BFF_TIMEOUT_MS,
    );
    // 빈 결과(미매핑/구성종목 없음)는 정상 — 200 kis 로 내려 모달이 빈 상태를 렌더.
    const result: SectorConstituentsResponse = {
      code,
      constituents,
      asOf: new Date().toISOString(),
    };
    return jsonWithDataSource(result, "kis", { "X-KIS-Env": resolveKisEnv() });
  } catch (error) {
    // never-throw — 타임아웃/KIS 비즈니스 오류/네트워크 모두 mock 으로 폴백.
    if (error instanceof Error && error.message === BFF_TIMEOUT_SENTINEL) {
      return jsonWithDataSource(
        getMockSectorConstituents(code),
        "mock-timeout",
        { "X-Error": FALLBACK_TIMEOUT_MESSAGE, "X-KIS-Env": resolveKisEnv() },
      );
    }
    return jsonWithDataSource(getMockSectorConstituents(code), "mock-error", {
      "X-Error": FALLBACK_SERVER_MESSAGE,
      "X-KIS-Env": resolveKisEnv(),
    });
  }
}
