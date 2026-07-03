/**
 * StockWarningBadges — 매수 유의사항(거래소 시장경보·VI) 칩 묶음.
 *
 * PRD `stock-warnings` / `intraday-warnings`. `toWarningChips` 로 라벨 중복 제거·심각도 정렬한
 * 뒤 디자인 시스템 배지(critical/warn/info)로 렌더한다. 종목 헤더·단타 워치 표·추천 후보에서 공유.
 * 활성 항목이 없으면 아무것도 렌더하지 않는다(레이아웃 무변화).
 */

import { cn } from "@/lib/utils/cn";
import {
  toWarningChips,
  type StockWarningSeverity,
} from "@/lib/copy/stock/warnings";

/** 심각도 → 디자인 시스템 배지 클래스 (`app/components.css` @layer components). */
const BADGE_BY_SEVERITY: Record<StockWarningSeverity, string> = {
  critical: "badge-critical",
  warn: "badge-warn",
  info: "badge-info",
};

export interface StockWarningBadgesProps {
  warnings: readonly { warningType: string }[] | undefined;
  /** 최대 표시 칩 수 — 좁은 지면(후보 칩)은 1로 최상위 심각도만. 기본 무제한. */
  max?: number;
  /** sm = 컴팩트(높이 축소) — 표 행·후보 칩용. 기본 md(종목 헤더). */
  size?: "sm" | "md";
  className?: string;
}

export function StockWarningBadges({
  warnings,
  max,
  size = "md",
  className,
}: StockWarningBadgesProps) {
  const chips = toWarningChips(warnings ?? []);
  if (chips.length === 0) return null;
  const shown = max != null ? chips.slice(0, max) : chips;

  return (
    <>
      {shown.map((chip) => (
        <span
          key={chip.label}
          className={cn(
            BADGE_BY_SEVERITY[chip.severity],
            size === "sm" && "h-[20px] px-sm text-caption",
            className,
          )}
        >
          {chip.label}
        </span>
      ))}
    </>
  );
}
