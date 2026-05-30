/**
 * AssetHero — `/profile` "내 자산" 총자산 히어로 카드.
 *
 * home-market-redesign PR1 — `/dashboard` 의 `PortfolioHero` 를 마이페이지로 이전(PRD §3.1).
 *
 * 디자인 정합 (DESIGN.md v9 §마이페이지 자산 히어로):
 *   - 셸 = `asset-hero` 합성 토큰(card-hero 와 동일 — rounded.xl + hero padding, 그림자 없음).
 *   - 총자산 = `font-display`(36px/800). 투자원금/평가손익/손익률 = 한국식 등락색(signal-up/down).
 *   - 자산비중 = 막대 → **도넛**(AssetDonut). 데스크탑은 도넛 우측, 모바일은 숫자 아래.
 *   - 범례 칩 = `badge-asset-stock` / `badge-asset-coin` + 퍼센트(색에만 의존하지 않는 보조 라벨).
 *
 * 거래성 항목(예수금/주문가능/실현손익/입출금) 미노출 — 조회·분석 전용 스코프(AC-9).
 * server-safe(useState 0).
 */

import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatMoney";
import { formatPct } from "@/lib/utils/formatPct";
import { AssetDonut } from "./AssetDonut";
import type { Portfolio } from "@/lib/types/profile/portfolio";
import {
  ASSET_TOTAL_VALUE,
  ASSET_PRINCIPAL,
  ASSET_PROFIT,
  ASSET_RATIO_STOCK,
  ASSET_RATIO_CRYPTO,
} from "@/lib/copy/profile/labels";

export interface AssetHeroProps {
  portfolio: Portfolio;
  /** 도넛 가운데 표기할 자산 종류 수(보유종목 기준 stock/crypto 종류 수). */
  assetCount: number;
}

export function AssetHero({ portfolio, assetCount }: AssetHeroProps) {
  const isUp = portfolio.profitPct >= 0;
  // 한국식 — 상승 = 빨강(signal-up), 하락 = 파랑(signal-down).
  const signalColor = isUp ? "text-signal-up" : "text-signal-down";
  const SignalIcon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <section
      className="asset-hero flex flex-col gap-2xl lg:flex-row lg:items-center lg:justify-between"
      aria-label={ASSET_TOTAL_VALUE}
    >
      {/* 좌측 — 총자산 + 손익 + 통계 */}
      <div className="flex-1">
        <p className="mb-sm text-body-sm text-text-muted">{ASSET_TOTAL_VALUE}</p>
        <div className="mb-xl flex items-end gap-md">
          <span className="text-font-display font-font-display tracking-tight tabular-nums">
            ₩ {formatNumber(portfolio.totalKrw)}
          </span>
          <div
            className={cn(
              "inline-flex items-center gap-xs pb-[2px] text-body-strong tabular-nums",
              signalColor,
            )}
          >
            <SignalIcon className="h-xl w-xl" aria-hidden="true" />
            <span>
              {formatPct(portfolio.profitPct, { digits: 1, sign: true })}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-lg border-t border-border-line pt-lg">
          <Stat
            label={ASSET_PRINCIPAL}
            value={`₩ ${formatNumber(portfolio.principalKrw)}`}
          />
          <Stat
            label={ASSET_PROFIT}
            value={`${portfolio.profitKrw >= 0 ? "+" : "-"} ₩ ${formatNumber(Math.abs(portfolio.profitKrw))}`}
            valueClassName={signalColor}
          />
        </div>
      </div>

      {/* 우측 — 자산비중 도넛 + 범례 (데스크탑 우측 / 모바일 아래) */}
      <div className="flex flex-col items-center gap-lg sm:flex-row sm:items-center lg:flex-col lg:items-center">
        <AssetDonut
          stockPct={portfolio.stockPct}
          cryptoPct={portfolio.cryptoPct}
          assetCount={assetCount}
        />
        <ul className="flex flex-col gap-sm">
          <Legend
            chipClass="badge-asset-stock"
            label={ASSET_RATIO_STOCK}
            pct={portfolio.stockPct}
          />
          <Legend
            chipClass="badge-asset-coin"
            label={ASSET_RATIO_CRYPTO}
            pct={portfolio.cryptoPct}
          />
        </ul>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div>
      <p className="mb-xs text-caption text-text-muted">{label}</p>
      <p className={cn("text-body-strong tabular-nums", valueClassName)}>
        {value}
      </p>
    </div>
  );
}

function Legend({
  chipClass,
  label,
  pct,
}: {
  chipClass: string;
  label: string;
  pct: number;
}) {
  return (
    <li className="flex items-center gap-sm">
      <span className={chipClass}>{label}</span>
      <span className="text-body-sm-strong text-text-strong tabular-nums">
        {pct}%
      </span>
    </li>
  );
}
