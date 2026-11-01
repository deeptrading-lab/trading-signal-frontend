/**
 * SwingScreenerRow — `/swing` 스크리너 1행(디자인 `docs/design/swing-ui.md` swing-row).
 *
 * [종목명 · 종가] + 둘째 줄 [시장 · 칩]. 주의 사유가 있으면 사유 칩(warn)만, 없으면 "충족 n/7"·연기금·국면.
 * 행 전체가 종목 상세 링크(키보드·새 탭 열기 기본 동작 유지).
 */

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatNumber } from "@/lib/utils/formatMoney";
import { stockDetailPath } from "@/lib/utils/stockDetailPath";
import { hasItemBit } from "@/lib/swing/itemBits";
import type { SwingScreenerItem } from "@/lib/types/swing/api";
import {
  SWING_PENSION_CHIP,
  swingExclusionLabel,
  swingMetChip,
  swingStageLabel,
} from "@/lib/copy/swing/labels";

export function SwingScreenerRow({ item }: { item: SwingScreenerItem }) {
  return (
    <li className="border-b border-border-line last:border-b-0">
      <Link
        href={stockDetailPath(item.ticker, item.name)}
        className="-mx-sm flex flex-col gap-xs rounded-sm px-sm py-md transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none"
      >
        <span className="flex items-baseline justify-between gap-md">
          <span className="min-w-0 truncate text-body-sm-strong text-text-strong">{item.name}</span>
          <span className="shrink-0 text-body-sm-strong tabular-nums text-text-strong">
            {formatNumber(item.close, { digits: 0 })}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-xs">
          <span className="text-caption text-text-muted">{item.market}</span>
          {item.exclusions.length > 0 ? (
            item.exclusions.map((code) => (
              <Badge key={code} variant="warn">
                {swingExclusionLabel(code)}
              </Badge>
            ))
          ) : (
            <>
              <Badge variant="accent">{swingMetChip(item.metCount)}</Badge>
              {hasItemBit(item.items, "Aplus") ? <Badge variant="accent">{SWING_PENSION_CHIP}</Badge> : null}
              <span className="text-caption text-text-muted">{swingStageLabel(item.stage)}</span>
            </>
          )}
        </span>
      </Link>
    </li>
  );
}
