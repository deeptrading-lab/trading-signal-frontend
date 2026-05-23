/**
 * PortfolioHero — `/dashboard` 의 hero 카드 (총 자산 + 변동률 + 통계 4-up).
 *
 * PR7 (finsight-redesign) 신규. PRD §3.3 PR7 + §5.6 AC-PAGE-1~8.
 *
 * 시안 `Stock and Coin Analysis App/src/app/components/Dashboard.tsx` L8~L52 정합 (톤만).
 *
 * 배경 결정 흐름 (사용자 dev 실측 2026-05-24):
 *   - 1차 다크 네이비 (`from-slate-900 to-slate-800`) → 다크모드 도입 시 재활용.
 *   - 2차 Bright Blue (`from-blue-700 to-blue-400`) → 한국식 signal-up (red) 과 색 충돌 (대비 1.4~2.5).
 *   - 3차 Purple/Indigo (`from-indigo-700 to-purple-600`) → 보색 관계지만 hero 자체 톤 부담.
 *   - **최종 White surface (card-hero v8 토큰)** → 시안의 다른 카드들과 톤 일관, 한국식 signal-up/-down
 *     (red / blue) 가독성 자연, hero 강조는 큰 라운드(xl=24px) + 큰 패딩(hero-px) + 그림자로 확보.
 *
 * v8 토큰 활용:
 *   - `card-hero` 합성 토큰 (bg-surface + border-border-line + rounded-xl + p-hero-px) — 베이스 셸.
 *   - `text-font-display` (Pretendard 36px / 800) — 대형 총 자산 숫자.
 *   - `text-signal-up` / `text-signal-down` — 변동률·평가손익 한국식 등락.
 *   - `bg-asset-stock` / `bg-asset-coin` — 주식·코인 비중 바.
 *   - `bg-surface-muted` — 비중 바 트랙.
 *   - `text-text-muted` — 라벨.
 *   - `border-border-line` — 구분선.
 *   - hex/px 직타 0건.
 *
 * 정적 server-safe 컴포넌트 — useState 0.
 */

import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatMoney";
import { formatPct } from "@/lib/utils/formatPct";
import type { Portfolio } from "@/lib/types/dashboard/portfolio";
import {
  PORTFOLIO_TOTAL_VALUE,
  PORTFOLIO_PRINCIPAL,
  PORTFOLIO_PROFIT,
  PORTFOLIO_STOCK_RATIO,
  PORTFOLIO_CRYPTO_RATIO,
} from "@/lib/copy/dashboard/labels";

export interface PortfolioHeroProps {
  portfolio: Portfolio;
}

export function PortfolioHero({ portfolio }: PortfolioHeroProps) {
  const isUp = portfolio.profitPct >= 0;
  // 한국식 — 상승 = 빨강 (signal-up), 하락 = 파랑 (signal-down). White 배경 위 자연 가독.
  const signalColor = isUp ? "text-signal-up" : "text-signal-down";
  const SignalIcon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <section className="card-hero shadow-sm" aria-label={PORTFOLIO_TOTAL_VALUE}>
      <p className="mb-sm text-body-sm text-text-muted">
        {PORTFOLIO_TOTAL_VALUE}
      </p>
      <div className="mb-2xl flex items-end gap-md">
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
          <span>{formatPct(portfolio.profitPct, { digits: 1, sign: true })}</span>
        </div>
      </div>

      {/* 통계 4-up — 모바일 2x2, 데스크탑 4 컬럼. */}
      <div className="grid grid-cols-2 gap-lg border-t border-border-line pt-lg md:grid-cols-4">
        <Stat
          label={PORTFOLIO_PRINCIPAL}
          value={`₩ ${formatNumber(portfolio.principalKrw)}`}
        />
        <Stat
          label={PORTFOLIO_PROFIT}
          value={`${portfolio.profitKrw >= 0 ? "+" : "-"} ₩ ${formatNumber(Math.abs(portfolio.profitKrw))}`}
          valueClassName={signalColor}
        />
        <RatioStat
          label={PORTFOLIO_STOCK_RATIO}
          pct={portfolio.stockPct}
          barClass="bg-asset-stock"
        />
        <RatioStat
          label={PORTFOLIO_CRYPTO_RATIO}
          pct={portfolio.cryptoPct}
          barClass="bg-asset-coin"
        />
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
      <p
        className={cn(
          "text-body-strong tabular-nums",
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  );
}

function RatioStat({
  label,
  pct,
  barClass,
}: {
  label: string;
  pct: number;
  barClass: string;
}) {
  // 비중 바 — 0~100. inline width 만 동적 계산 (Tailwind 의 임의 % width 클래스 회피 — 합성
  // 토큰 룰 정합. style 안 동적 계산은 컨벤션 §4 의 예외로 허용).
  return (
    <div>
      <p className="mb-xs text-caption text-text-muted">{label}</p>
      <div className="flex items-center gap-sm">
        <div className="h-[8px] w-full overflow-hidden rounded-pill bg-surface-muted">
          <div
            className={cn("h-full", barClass)}
            style={{ width: `${pct}%` }}
            aria-hidden="true"
          />
        </div>
        <span className="text-body-sm-strong tabular-nums">{pct}%</span>
      </div>
    </div>
  );
}
