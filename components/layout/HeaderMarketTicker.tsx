/**
 * HeaderMarketTicker — 데스크탑 헤더 글로벌 마켓 티커의 client 데이터 경계.
 *
 * PRD `header-market-ticker` §3.5 (§9 q4 확정) — `Header.tsx` 가 mock 직접 import 를 끊고,
 * 티커 부분만 본 client 컨테이너로 분리해 `useQueryMarketTicker()` 로 실데이터(5종)를 조달한다.
 * `IndicesCardContainer` / `WatchlistContainer` 선례 정합 — 데이터 fetch + 상태 분기 = 컨테이너.
 *
 * 마크업·토큰은 기존 `Header.tsx` 티커 렌더에서 **그대로 이전**(비주얼 동일, 디자이너 미합류):
 *   - 래퍼 `hidden lg:flex`(데스크탑 전용, 모바일 영향 0) + `gap-lg text-caption`.
 *   - 구분선 `w-px h-3 bg-border-line`(i > 0).
 *   - 코드 `text-text-muted`, 값 `text-body-sm-strong text-text-strong tabular-nums`.
 *   - 등락 한국식 색 `signal-up`(red) / `signal-down`(blue) + `▲/▼ {x.x}%`.
 *
 * 상태 처리 (PRD §3.7):
 *   - 로딩: 헤더 높이를 유지하는 slim placeholder(레이아웃 시프트 0). 별도 카드 skeleton 미사용.
 *   - 부분 실패: BFF 가 `Promise.allSettled` 로 성공분만 반환 → 받은 것만 렌더(보통 mock degrade 로 5건).
 *   - 전체 실패: BFF 가 mock 5건을 200 으로 graceful degrade → data 우선 소비(헤더 끊김 0).
 *   - 에러 배지 없음(§9 q6 — 보조 정보, 페이지 에러 승격 금지). data 가 비면 placeholder 유지.
 *
 * 커스텀훅 의무화 (frontend.md §1) — `useQuery` 직접 import 금지. 도메인 훅만 소비.
 */

"use client";

import { Fragment } from "react";
import { useQueryMarketTicker } from "@/hooks/market/useQueryMarketTicker";
import { HEADER_MARKET_TICKER_ARIA } from "@/lib/copy/layout/navCopy";
import { cn } from "@/lib/utils/cn";

/** 로딩/빈 상태 placeholder 슬롯 수 — 실데이터 5종과 동일 폭감으로 레이아웃 시프트 0. */
const TICKER_PLACEHOLDER_SLOTS = 5;

export function HeaderMarketTicker() {
  const { data, isLoading } = useQueryMarketTicker();
  const tickers = data ?? [];

  // 로딩 중이거나(초기) 아직 데이터가 비면 헤더 높이를 유지하는 placeholder 를 렌더한다.
  // BFF 가 전체 실패 시에도 mock 5건을 200 으로 내려주므로 정상 흐름에서는 항상 5건이 온다.
  if (isLoading || tickers.length === 0) {
    return (
      <div
        className="hidden lg:flex items-center gap-lg text-caption"
        aria-label={HEADER_MARKET_TICKER_ARIA}
        aria-busy={isLoading}
      >
        {Array.from({ length: TICKER_PLACEHOLDER_SLOTS }).map((_, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <span className="w-px h-3 bg-border-line" aria-hidden="true" />
            )}
            <span
              className="h-3 w-24 rounded-pill bg-surface-muted"
              aria-hidden="true"
            />
          </Fragment>
        ))}
      </div>
    );
  }

  return (
    <div
      className="hidden lg:flex items-center gap-lg text-caption"
      aria-label={HEADER_MARKET_TICKER_ARIA}
    >
      {tickers.map((t, i) => (
        <Fragment key={t.code}>
          {i > 0 && (
            <span
              className={cn(
                "h-3",
                t.code === "S&P 500" || t.code === "BTC"
                  ? "w-0.5 bg-text-muted"
                  : "w-px bg-border-line",
              )}
              aria-hidden="true"
            />
          )}
          <div className="flex items-center gap-sm">
            <span className="text-text-muted">{t.code}</span>
            <span className="text-body-sm-strong text-text-strong tabular-nums">
              {t.value}
            </span>
            <span
              className={cn(
                "tabular-nums",
                t.isUp ? "text-signal-up" : "text-signal-down",
              )}
            >
              {t.isUp ? "▲" : "▼"} {Math.abs(t.changePct).toFixed(1)}%
            </span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
