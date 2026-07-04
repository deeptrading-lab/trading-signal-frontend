/**
 * MarketStatusBadge — 국내 장 상태 배지(점 + 라벨). 헤더 지수 스트립 자리에 상시 노출.
 *
 * PRD `toss-market-calendar` §3-7 / DESIGN 핸드오프 매트릭스. **자족 컴포넌트** — 내부에서
 * `useMarketStatus()` 호출(`StockWarningBadges`·`OrderbookPanel` 선례). 지면(`Header`)은 배치만.
 *
 * - 점 색이 1차 상태 신호(색+텍스트 이중 인코딩, 색맹 접근성). 장중(`regular`)만 옅은 녹색 필 +
 *   은은한 펄스로 라이브 강조, 나머지는 배경 없는 인라인.
 * - 반응형(§Layout): 모바일=축약 라벨, 태블릿↑=풀 라벨, 데스크탑=풀 라벨 + "다음 개장" 보조.
 *   `useBreakpoint` 로 JS 분기(모바일에도 렌더 — 티커의 `hidden lg:flex` gate 상속 안 함).
 * - fail-soft: `unknown`(키 없음/조회 실패)·데이터 미도착 → **null 반환**(자기 은닉, 미표시).
 * - US(해외 장) 배지는 본 범위 밖(PRD §4). 가로 flex + 오른쪽 슬롯만 예약한다.
 */

"use client";

import { useMarketStatus } from "@/hooks/market/useMarketStatus";
import { useBreakpoint } from "@/hooks/utils/useBreakpoint";
import { cn } from "@/lib/utils/cn";
import {
  MARKET_STATUS_ARIA,
  marketStatusLabel,
  nextOpenText,
} from "@/lib/copy/market/marketStatus";
import type { MarketPhase } from "@/lib/types/market/marketStatus";

/** phase 별 점 색(토큰 유틸). 열림=녹색·장전=amber·시간외=blue·마감/휴장=회색·불명=흐린 회색. */
const DOT_COLOR_BY_PHASE: Record<MarketPhase, string> = {
  regular: "bg-market-open",
  pre: "bg-warn",
  after: "bg-info",
  closed: "bg-text-muted",
  unknown: "bg-border-line",
};

export interface MarketStatusBadgeProps {
  className?: string;
}

export function MarketStatusBadge({ className }: MarketStatusBadgeProps) {
  const status = useMarketStatus();
  const { isMobile, isDesktop } = useBreakpoint();
  const label = marketStatusLabel(status);

  // fail-soft(unknown/미도착) → 자기 은닉. 지면은 조건부 렌더 불필요.
  if (!label) return null;

  const isOpen = status.phase === "regular";
  const supplement =
    status.phase === "closed" && status.nextOpen
      ? nextOpenText(status.nextOpen)
      : null;
  // 모바일=축약 라벨, 태블릿/데스크탑=풀 라벨. 보조("다음 개장")는 데스크탑만.
  const labelText = isMobile ? label.short : label.full;
  const ariaLabel = `${MARKET_STATUS_ARIA}: ${label.full}${supplement ? ` · ${supplement}` : ""}`;

  return (
    <div
      className={cn("flex items-center gap-sm", className)}
      role="status"
      aria-label={ariaLabel}
    >
      <span className={isOpen ? "market-badge-open" : "market-badge"}>
        <span
          className={cn(
            "h-sm w-sm rounded-pill",
            DOT_COLOR_BY_PHASE[status.phase],
            isOpen && "motion-safe:animate-pulse",
          )}
          aria-hidden="true"
        />
        <span>{labelText}</span>
      </span>
      {supplement && isDesktop && (
        <span className="text-caption text-text-muted" aria-hidden="true">
          {supplement}
        </span>
      )}
      {/* US(해외 장) 배지 슬롯 예약 — 가로 flex 오른쪽. 본 범위 밖(PRD §4). */}
    </div>
  );
}
