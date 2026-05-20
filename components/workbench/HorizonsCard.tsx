/**
 * horizons (단/중/장기) 카드.
 *
 * DESIGN.md 결정: `typography.body-sm` × `{colors.body-strong}` 으로 3개 줄.
 * 라벨은 BE 가 `label` 로 한글/영문을 줄 수 있어 그대로 노출하고, 보조 통계는 캡션.
 */

import type { Horizons } from "@/lib/types/workbench";
import { formatPct } from "@/lib/formatters/pct";

type Props = {
  horizons: Horizons;
};

const DIRECTION_LABEL: Record<string, string> = {
  BULLISH: "상승",
  BEARISH: "하락",
  NEUTRAL: "보합",
};

export function HorizonsCard({ horizons }: Props) {
  if (!horizons || horizons.length === 0) return null;
  return (
    <article className="card" aria-label="구간별 추세">
      <p className="mb-sm text-h2 text-primary">구간별 추세</p>
      {horizons.map((h, idx) => (
        <div
          key={`${h.label}-${idx}`}
          className="grid grid-cols-[64px_1fr] gap-md py-sm border-b border-line last:border-b-0"
        >
          <span className="text-caption text-secondary">{h.label}</span>
          <span className="text-body-sm text-body-strong">
            {(DIRECTION_LABEL[h.direction] ?? h.direction) + " · "}
            수익률{" "}
            <strong className="tabular">
              {formatPct(h.return_pct, { sign: true })}
            </strong>
            {" · 최대 낙폭 "}
            <strong className="tabular">{formatPct(h.max_drawdown_pct)}</strong>
          </span>
        </div>
      ))}
    </article>
  );
}
