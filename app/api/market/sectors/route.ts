/**
 * `/api/market/sectors` BFF route — "지금 뜨는 산업" 업종 등락 랭킹.
 *
 * 브라우저 → 본 route handler → KIS REST 단방향(AGENTS.md BFF 원칙). fluctuation 과 동일한 안전 장치:
 *   - **이중 게이트** — `isKisConfigured()` AND `resolveKisEnv()==="prod"` 일 때만 실호출
 *     (TR `FHPUP02140000`/`FHPUP02100000` 은 실전 전용·모의 미지원) → 미충족 시 mock.
 *   - `withTimeout` + transient 1회 재시도(EGW00201 초당 한도 보호), 타임아웃 → mock-timeout.
 *   - **never-throw** — 키 없음/KIS 오류/빈 결과 모두 mock 으로 폴백(브라우저 5xx 0건). 점검은
 *     `X-Data-Source`(mock-timeout·mock-error·mock-empty)로 표면화해 클라가 `MaintenanceNotice`
 *     로 흡수(에러 카드 아님).
 *   - `X-KIS-Env` 헤더 + `Cache-Control: no-store`.
 */

import { isKisConfigured, resolveKisEnv } from "@/lib/api/kis";
import { fetchSectorRanking } from "@/lib/api/kis/sectors";
import { fetchLatestTradingDate } from "@/lib/api/kis/tradingDate";
import { getMockSectorRanking } from "@/lib/mock/market/sectors";
import type { SectorRankingResponse } from "@/lib/types/market/sectors";
import {
  withTimeout,
  jsonWithDataSource,
  fetchWithTransientRetryOrThrow,
  BFF_TIMEOUT_SENTINEL,
} from "@/lib/server/bffUtils";

const BFF_TIMEOUT_MS = 10_000; // breadth fan-out 포함이라 단건보다 여유.
const RETRY_BACKOFF_MS = 250;
/** 거래일 조회 예산 — 랭킹 예산을 잠식하지 않도록 짧게 끊는다. */
const TRADING_DATE_TIMEOUT_MS = 2_000;
/** 표시 상위 업종 수 — 토스 밀도(≈13) 정합. */
const TOP_N = 13;

const FALLBACK_TIMEOUT_MESSAGE = "KIS 서버 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.";
const FALLBACK_SERVER_MESSAGE = "업종 랭킹을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";

export async function GET() {
  // 이중 게이트 — 실전 전용 TR 이므로 미충족 시 KIS 실호출 없이 mock.
  if (!isKisConfigured() || resolveKisEnv() !== "prod") {
    return jsonWithDataSource(getMockSectorRanking(TOP_N), "mock", {
      "X-KIS-Env": resolveKisEnv(),
    });
  }

  try {
    // 거래일은 별도 TR 이라 랭킹과 나란히 부르되, **자기 예산**을 준다.
    // 예외는 `fetchLatestTradingDate` 가 스스로 흡수하지만 지연은 흡수하지 못한다. 랭킹의 10초를
    // 나눠 쓰게 두면 토스 폴백·재시도로 느려진 거래일 조회 하나가 이미 성공한 랭킹까지 mock 으로
    // 떨어뜨린다. 짧은 예산 안에 못 오면 날짜 없이 내보낸다(소비자는 null 이면 표기하지 않는다).
    const [sectors, tradingDate] = await withTimeout(
      Promise.all([
        fetchWithTransientRetryOrThrow(
          () => fetchSectorRanking(TOP_N),
          RETRY_BACKOFF_MS,
        ),
        withTimeout(fetchLatestTradingDate(), TRADING_DATE_TIMEOUT_MS).catch(
          () => null,
        ),
      ]),
      BFF_TIMEOUT_MS,
    );
    if (sectors.length === 0) {
      // 전량 필터링/빈 결과 → 502 대신 mock 으로 fail-soft.
      return jsonWithDataSource(getMockSectorRanking(TOP_N), "mock-empty", {
        "X-KIS-Env": resolveKisEnv(),
      });
    }
    const result: SectorRankingResponse = {
      sectors,
      asOf: new Date().toISOString(),
      tradingDate,
    };
    return jsonWithDataSource(result, "kis", { "X-KIS-Env": resolveKisEnv() });
  } catch (error) {
    // never-throw — 타임아웃/KIS 비즈니스 오류/네트워크 모두 mock 으로 폴백.
    if (error instanceof Error && error.message === BFF_TIMEOUT_SENTINEL) {
      return jsonWithDataSource(getMockSectorRanking(TOP_N), "mock-timeout", {
        "X-Error": FALLBACK_TIMEOUT_MESSAGE,
        "X-KIS-Env": resolveKisEnv(),
      });
    }
    return jsonWithDataSource(getMockSectorRanking(TOP_N), "mock-error", {
      "X-Error": FALLBACK_SERVER_MESSAGE,
      "X-KIS-Env": resolveKisEnv(),
    });
  }
}
