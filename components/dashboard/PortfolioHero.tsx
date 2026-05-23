/**
 * PortfolioHero — `/dashboard` 의 hero 카드 (총 자산 + 변동률 + 통계 4-up).
 *
 * PR7 (finsight-redesign) 신규. PRD §3.3 PR7 + §5.6 AC-PAGE-1~8.
 *
 * 시안 `Stock and Coin Analysis App/src/app/components/Dashboard.tsx` L8~L52 정합.
 *   - 다크 그라데이션 (`from-slate-900 to-slate-800`) — DESIGN.md v8 토큰에 hero 다크 전용 토큰
 *     없음. **결정 (옵션 A)**: Tailwind 기본 `slate-900/-800` color 클래스 활용 (hex/px 직타 0,
 *     팔레트 명명만 사용). v8 토큰 추가는 별도 PR (디자인 갱신).
 *   - 데코 blob — 시안 `animate-blob` 미도입. **결정 (옵션 A)**: 정적 blob (animation 없이 색 blur).
 *     `bg-asset-stock` / `bg-accent-vivid` v8 토큰 — `bg-blue-500`/`bg-purple-500` 시안 hex 대체.
 *   - 시안의 `text-emerald-400` (변동률 상승) → **한국식 cascade 적용**: `text-signal-up` (red).
 *     `text-emerald-400` (평가손익 양수) → `text-signal-up`.
 *   - 주식 비중 바 `bg-blue-400` → `bg-asset-stock` 토큰.
 *   - 코인 비중 바 `bg-orange-400` → `bg-asset-coin` 토큰.
 *
 * v8 토큰 활용:
 *   - rounded-xl (24px) + Tailwind slate 그라데이션 (옵션 A 사유 위 참조).
 *   - `text-font-display` (Pretendard 36px / 800) — 대형 총 자산 숫자.
 *   - `signal-up-text` 합성 토큰 — 변동률·평가손익 (한국식).
 *   - `bg-asset-stock` / `bg-asset-coin` — 주식/코인 비중 바.
 *   - `tabular-nums` — 자릿수 정렬.
 *   - hex/px 직타 0건 — Tailwind 토큰만.
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
  // 한국식 — 상승 = 빨강 (signal-up), 하락 = 파랑 (signal-down).
  // 다크 hero 안에서는 v8 토큰의 raw hex 가 충분히 가독 — soft 페어 미사용.
  const signalColor = isUp ? "text-signal-up" : "text-signal-down";
  const SignalIcon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <section
      // 옵션 A: Tailwind slate-900/-800 그라데이션. v8 토큰에 hero 다크 전용 없음.
      // rounded-xl (24px) + hero padding 토큰.
      className="relative overflow-hidden rounded-xl p-hero-px bg-gradient-to-br from-slate-900 to-slate-800 text-surface"
      aria-label={PORTFOLIO_TOTAL_VALUE}
    >
      {/* 정적 blob 데코 (옵션 A — animation 없이 색 blur).
       *  `bg-asset-stock` (blue) / `bg-accent-vivid` (blue 강조). 시안의 `blue-500`/`purple-500` 대신 v8 토큰. */}
      <div
        className="absolute top-0 right-0 h-64 w-64 rounded-pill bg-asset-stock opacity-20 mix-blend-multiply blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute top-0 right-32 h-64 w-64 rounded-pill bg-accent-vivid opacity-20 mix-blend-multiply blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10">
        {/* 라벨 — 다크 hero 안 무채색 라벨 (white/60 — color 토큰 cascade 의 hex 직타 회피용으로
         *  Tailwind 의 opacity utility 활용. 합성 토큰 신설 대신 inline 으로 — 본 hero 1개소만 사용). */}
        <p className="mb-sm text-body-sm text-surface/60">
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

        {/* 통계 4-up — 모바일 2x2, 데스크탑 4 컬럼. border-t white/10 (시안 정합 — 다크 카드 안 구분자). */}
        <div className="grid grid-cols-2 gap-lg border-t border-surface/10 pt-lg md:grid-cols-4">
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
      <p className="mb-xs text-caption text-surface/60">{label}</p>
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
      <p className="mb-xs text-caption text-surface/60">{label}</p>
      <div className="flex items-center gap-sm">
        <div className="h-[8px] w-full overflow-hidden rounded-pill bg-surface/10">
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
