/**
 * MarketClosedNotice — 라이브 섹션이 장 마감/휴장일 때 리스트 영역을 대체하는 **공용 중립 안내**.
 *
 * PRD `market-status-aware-home` §3-4 / DESIGN R1·R2·R4. 실시간 순위(`RealtimeRankingSection`)·
 * 순매수 당일(`InvestorFlowTop10Card`)이 재사용한다. ②의 `MarketStatusBadge` 회색(closed) 톤·
 * "장 마감/휴장 · 다음 개장" 언어를 그대로 답습해 헤더 배지와 한 목소리를 낸다.
 *
 * - 중립(muted) 톤: `surface-muted` 배경 + 회색 점(`text-muted`, ②의 `status-dot-closed` 와 동일) +
 *   `primary` 제목 + `text-muted` 보조. **빨강·경고색·다시 시도 버튼 없음**(마감은 에러가 아님).
 * - 제목/다음 개장 문자열은 ②의 `marketStatusLabel`·`nextOpenText`(`lib/copy/market/marketStatus.ts`)
 *   를 그대로 재사용 — 배지와 동일 문자열 렌더.
 * - `nudge` 슬롯: 순매수 당일만 넘긴다(넛지 문구 + "7일 누적 보기" 링크). 실시간 순위는 미전달.
 * - 색·간격은 토큰만(hex/px 직타 0), 색맹 접근성 위해 점만 남기지 않고 제목 라벨 동반(이중 인코딩).
 */

"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import {
  MARKET_CLOSED_TITLE_FALLBACK,
  marketStatusLabel,
  nextOpenText,
} from "@/lib/copy/market/marketStatus";
import type { MarketStatus } from "@/lib/types/market/marketStatus";

export interface MarketClosedNoticeProps {
  /** 제목("장 마감"/"휴장")·다음 개장 파생 원천. `useMarketStatus()` 를 그대로 넘긴다. */
  status: MarketStatus;
  /** 순매수 당일 전용 넛지 슬롯(문구 + "7일 누적 보기" 링크). 실시간 순위는 미전달. */
  nudge?: ReactNode;
  className?: string;
}

export function MarketClosedNotice({
  status,
  nudge,
  className,
}: MarketClosedNoticeProps) {
  const label = marketStatusLabel(status);
  const title = label?.full ?? MARKET_CLOSED_TITLE_FALLBACK;
  const supplement = status.nextOpen ? nextOpenText(status.nextOpen) : null;

  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-sm rounded-lg bg-surface-muted px-xl py-xl text-center",
        className,
      )}
    >
      {/* 회색 점 + 제목(가로 인라인) — ②의 status-dot-closed 와 동일 색·형태. */}
      <div className="flex items-center gap-xs">
        <span
          className="h-sm w-sm rounded-pill bg-text-muted"
          aria-hidden="true"
        />
        <span className="text-body-strong text-primary">{title}</span>
      </div>

      {/* 다음 개장 보조 — nextOpen 있을 때만(캘린더 폴백은 null 이라 생략). */}
      {supplement && (
        <span className="text-caption text-text-muted">{supplement}</span>
      )}

      {/* 순매수 당일 넛지 슬롯 */}
      {nudge && <div className="mt-md">{nudge}</div>}
    </div>
  );
}
