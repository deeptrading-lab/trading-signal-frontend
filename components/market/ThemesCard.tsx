/**
 * ThemesCard — `/market` 인기 테마 / 섹터 카드.
 *
 * PR8 (finsight-redesign) 신규.
 *
 * 시안 `MarketTrends.tsx` L13~L39 정합 — 카드 헤더 (Flame 아이콘 + 타이틀) + 4 항목.
 * 각 항목: 테마명 + 등락률 (한국식) + 대표 종목 미리보기 ("엔비디아, 마이크로소프트, 루닛 등").
 *
 * v8 토큰:
 *   - 카드 셸 = `card` 합성 토큰 (rounded.lg + card padding).
 *   - 헤더 좌측 아이콘 = `text-accent-vivid` (시안의 `text-orange-500` 정합 v8 토큰 cascade).
 *   - 등락률 = `signal-up-text` / `signal-down-text` 합성 토큰 (한국식 — 상승 빨강 / 하락 파랑).
 *   - 테마 항목 셸 = `border border-border-line rounded-md p-md`. hover → `border-accent-vivid`.
 *
 * 정적 server-safe 컴포넌트 — useState 0.
 */

import { Flame } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatPct } from "@/lib/utils/formatPct";
import type { MarketTheme } from "@/lib/types/market/themes";
import {
  MARKET_THEMES_TITLE,
  MARKET_THEME_STOCKS_SUFFIX,
} from "@/lib/copy/market/labels";

export interface ThemesCardProps {
  themes: MarketTheme[];
}

export function ThemesCard({ themes }: ThemesCardProps) {
  return (
    <section className="card" aria-label={MARKET_THEMES_TITLE}>
      <header className="mb-lg flex items-center gap-sm">
        <Flame
          className="h-xl w-xl text-accent-vivid"
          aria-hidden="true"
        />
        <h2 className="text-h2 text-text-strong">{MARKET_THEMES_TITLE}</h2>
      </header>
      <ul className="flex flex-col gap-md">
        {themes.map((theme) => (
          <ThemeRow key={theme.name} theme={theme} />
        ))}
      </ul>
    </section>
  );
}

function ThemeRow({ theme }: { theme: MarketTheme }) {
  const signalClass = theme.isUp ? "signal-up-text" : "signal-down-text";
  return (
    <li className="rounded-md border border-border-line p-md transition-colors hover:border-accent-vivid">
      <div className="mb-xs flex items-center justify-between">
        <span className="text-body-strong text-text-strong">{theme.name}</span>
        <span className={cn("text-body-strong", signalClass)}>
          {formatPct(theme.changePct, { digits: 1, sign: true })}
        </span>
      </div>
      <p className="text-caption text-text-muted">
        {theme.representativeStocks.join(", ")} {MARKET_THEME_STOCKS_SUFFIX}
      </p>
    </li>
  );
}
