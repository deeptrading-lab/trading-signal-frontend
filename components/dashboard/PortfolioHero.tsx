/**
 * PortfolioHero — `/dashboard` 의 hero 카드 (총 자산 + 변동률 + 통계 4-up).
 *
 * PR7 (finsight-redesign) 신규. PRD §3.3 PR7 + §5.6 AC-PAGE-1~8.
 *
 * 시안 `Stock and Coin Analysis App/src/app/components/Dashboard.tsx` L8~L52 정합.
 *   - **그라데이션** — 다크 네이비 (`from-slate-900 to-slate-800`) 는 다크모드 도입 시 재활용.
 *     라이트 모드 hero 는 **Purple/Indigo 단톤 (`from-indigo-700 to-purple-600`)** — 한국식
 *     signal-up (red) 과의 보색 관계로 신호 색 가독성 보강 + 시안 blob purple 영감.
 *     사용자 dev 실측 후 재선택 2026-05-24 (직전 Bright Blue 는 red 와 색 충돌).
 *     Tailwind 기본 palette 명명 (hex 직타 0).
 *   - 데코 blob — 시안 `animate-blob` 미도입. 정적 blob (animation 없이 색 blur).
 *     Purple/Indigo hero 위에서 같은 보라 blob 은 묻혀버리므로 **보색 (`bg-pink-400` + `bg-cyan-400`)**
 *     로 시각 흥미 확보. Tailwind 기본 palette (hex 직타 0).
 *   - 시안의 `text-emerald-400` (변동률 상승) → **한국식 cascade 적용**: `text-signal-up` (red).
 *     `text-emerald-400` (평가손익 양수) → `text-signal-up`.
 *   - 주식 비중 바 — 다크 hero 시절 `bg-asset-stock` (blue) → Bright Blue hero 위 자기 색과 묻힘 →
 *     `bg-white/40` (반투명 white) 로 가독성 재정합.
 *   - 코인 비중 바 `bg-orange-400` → `bg-asset-coin` 토큰 (Bright Blue 배경 위 orange 대비 OK 유지).
 *
 * v8 토큰 활용:
 *   - rounded-xl (24px) + Tailwind blue 그라데이션 (Bright Blue 단톤 사유 위 참조).
 *   - `text-font-display` (Pretendard 36px / 800) — 대형 총 자산 숫자.
 *   - `signal-up-text` 합성 토큰 — 변동률·평가손익 (한국식).
 *   - `bg-asset-coin` — 코인 비중 바.
 *   - `tabular-nums` — 자릿수 정렬.
 *   - hex/px 직타 0건 — Tailwind 토큰·기본 palette 만.
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
  // Purple/Indigo 배경 (보색 관계) 위에서 red-500 / blue-500 대비 자연 — v8 토큰 그대로.
  const signalColor = isUp ? "text-signal-up" : "text-signal-down";
  const SignalIcon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <section
      // Purple/Indigo 단톤 그라데이션 (사용자 dev 실측 후 재선택 2026-05-24).
      // 다크 네이비 (slate-900/-800) 는 다크모드 도입 시 재활용. 직전 Bright Blue (blue-700→blue-400) 는
      // 한국식 signal-up (red) 과 색 충돌 (대비비 1.4~2.5) — 보색 관계인 indigo/purple 로 교체.
      // rounded-xl (24px) + hero padding 토큰. Tailwind 기본 palette (hex 직타 0).
      className="relative overflow-hidden rounded-xl p-hero-px bg-gradient-to-br from-indigo-700 to-purple-600 text-white"
      aria-label={PORTFOLIO_TOTAL_VALUE}
    >
      {/* 정적 blob 데코 — Purple/Indigo hero 위에서 같은 보라 토큰은 묻혀버리므로 보색 (pink/cyan) 사용.
       *  Tailwind 기본 palette 명명 (hex 직타 0). text-white 가독성 무영향 (mix-blend-multiply + blur-3xl). */}
      <div
        className="absolute top-0 right-0 h-64 w-64 rounded-pill bg-pink-400 opacity-20 mix-blend-multiply blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute top-0 right-32 h-64 w-64 rounded-pill bg-cyan-400 opacity-20 mix-blend-multiply blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10">
        {/* 라벨 — Bright Blue hero 안 무채색 라벨 (white/60). Tailwind opacity utility — text-white 와
         *  동일 cascade. 합성 토큰 신설 대신 inline 으로 — 본 hero 1개소만 사용.
         *  white/60 → white/80: Bright Blue hero 위 가독성 보강 (사용자 dev 실측 2026-05-24). */}
        <p className="mb-sm text-body-sm text-white/80">
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

        {/* 통계 4-up — 모바일 2x2, 데스크탑 4 컬럼. border-t white/10 (Bright Blue hero 안 구분자). */}
        <div className="grid grid-cols-2 gap-lg border-t border-white/10 pt-lg md:grid-cols-4">
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
            barClass="bg-white/70"
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
      <p className="mb-xs text-caption text-white/80">{label}</p>
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
      <p className="mb-xs text-caption text-white/80">{label}</p>
      <div className="flex items-center gap-sm">
        <div className="h-[8px] w-full overflow-hidden rounded-pill bg-white/20">
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
