/**
 * useMarketStatus — 국내 장 상태 도메인 훅. `MarketStatusBadge` 등 지면이 이것만 소비한다.
 *
 * PRD `toss-market-calendar` §3-6. `useQueryMarketCalendar`(정적 캐시)로 원본 캘린더를 받아,
 * **세션 경계(09:00·15:30·20:00 등)를 지나면 네트워크 재요청 없이** 클라에서 `deriveMarketStatus`
 * 를 재적용해 phase 를 갱신한다(§9 q2 권고 b — 다음 경계까지 `setTimeout` 1회, 경계 지나면 재예약).
 *
 * - 데이터 도착 전/키 없음/실패 → 서버가 준 status(unknown 포함) 또는 `UNKNOWN_MARKET_STATUS`.
 * - 첫 페인트는 서버 주입 시각 기반 status 를 그대로 써 클라 시계 오차를 피하고, 마운트 이후
 *   경계 경과분만 클라 재평가로 반영한다.
 * - `isRegularOpen`(fail-open)을 그대로 노출 → 후속 폴링 게이트가 소비 가능(§8·q3).
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryMarketCalendar } from "@/hooks/market/useQueryMarketCalendar";
import { deriveMarketStatus, sessionBoundaries } from "@/lib/market/marketClock";
import {
  UNKNOWN_MARKET_STATUS,
  type MarketStatus,
} from "@/lib/types/market/marketStatus";

/** 경계 직후 재평가가 확실히 다음 구간으로 넘어가도록 두는 소폭 버퍼(ms). */
const BOUNDARY_TICK_BUFFER_MS = 500;

export function useMarketStatus(): MarketStatus {
  const { data } = useQueryMarketCalendar();
  const calendar = data?.calendar ?? null;
  const serverStatus = data?.status ?? UNKNOWN_MARKET_STATUS;

  // 마운트 이후 경계 경과분만 클라 재평가에 반영(null = 아직 서버 주입 시각 사용).
  const [reevalAtMs, setReevalAtMs] = useState<number | null>(null);

  useEffect(() => {
    if (!calendar) return;
    const bounds = sessionBoundaries(calendar);
    if (bounds.length === 0) return;

    const now = Date.now();
    const nextBoundary = bounds.find((b) => b > now);
    if (nextBoundary == null) return; // 마감 후 — 오늘 남은 경계 없음.

    const timer = setTimeout(
      () => setReevalAtMs(Date.now()),
      nextBoundary - now + BOUNDARY_TICK_BUFFER_MS,
    );
    return () => clearTimeout(timer);
    // reevalAtMs 변화 시 재실행 → 경계마다 다음 경계 재예약.
  }, [calendar, reevalAtMs]);

  return useMemo<MarketStatus>(() => {
    if (!calendar) return serverStatus;
    // 첫 페인트(reevalAtMs=null)는 서버 주입 시각 status, 이후는 클라 시각으로 재평가.
    if (reevalAtMs == null) return serverStatus;
    return deriveMarketStatus(calendar, reevalAtMs);
  }, [calendar, serverStatus, reevalAtMs]);
}
