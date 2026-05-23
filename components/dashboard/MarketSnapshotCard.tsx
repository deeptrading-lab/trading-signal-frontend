/**
 * MarketSnapshotCard — `/dashboard` 오늘장 특징 (Fear & Greed Index + 상승/하락 종목 수).
 *
 * PR7 (finsight-redesign) 신규.
 *
 * 시안 `Dashboard.tsx` L90~L119 정합.
 *   - 헤더: TrendingUp 아이콘 + "오늘장 특징".
 *   - Fear & Greed Index 인디케이터:
 *      - 라벨 + 값 + Greed 텍스트.
 *      - 그라데이션 막대 — 시안 `from-red-500 via-yellow-500 to-emerald-500` (글로벌 컨벤션, 공포=red, 탐욕=green).
 *      - **결정**: Fear & Greed Index 는 등락 의미가 아닌 시장 심리 인덱스 — 글로벌 컨벤션 유지가
 *        의미상 자연. v8 의 `signal-up/-down` (한국식 등락) 적용 시 의미 충돌. 시안의
 *        red→yellow→green cascade 를 v8 토큰에 매핑:
 *           red → `signal-down` (#1d4ed8 blue) 은 의미 충돌 — 사용 X.
 *           red → `critical` (#8e1717 red, 본 저장소 위험/오류 의미) 활용.
 *           yellow → `warn` (#a14a06, 본 저장소 경고 의미).
 *           green → `signal-up` (#c81e1e red, 한국식 상승) 은 의미 충돌 — 사용 X.
 *        → **타협 (옵션 C)**: Fear & Greed 만 글로벌 컨벤션 유지하되 v8 토큰 cascade 로
 *        `from-critical via-warn to-asset-stock` 사용 — `asset-stock` (blue) 이 "긍정·탐욕" 의미로
 *        부적합하므로 다시 검토 → **최종 채택**: 시안의 글로벌 컨벤션 그대로 — Tailwind 기본 팔레트
 *        `from-red-500 via-yellow-500 to-emerald-500` 활용 (color 명명 활용, hex 직타 0).
 *        본 그라데이션은 Fear & Greed 인덱스 한정 의미 — 등락 토큰과 의도적 분리. 코멘트로 사유 명시.
 *   - 상승/하락 종목 수 2-up:
 *      - 상승 종목 = `text-signal-up` (red, 한국식).
 *      - 하락 종목 = `text-signal-down` (blue, 한국식).
 *
 * v8 토큰:
 *   - 카드 셸 = `card` 합성 토큰.
 *   - 헤더 아이콘 = `text-accent-vivid` (시안의 `text-purple-500` 대신 v8 cascade).
 *   - 상승/하락 = `text-signal-up` / `text-signal-down` (한국식).
 *   - Fear & Greed 인디케이터 박스 = `bg-surface-muted` (시안 `bg-slate-50` 정합).
 *
 * 정적 server-safe 컴포넌트 — useState 0.
 */

import { TrendingUp } from "lucide-react";
import { formatNumber } from "@/lib/utils/formatMoney";
import type { FearGreed, FearGreedLabel } from "@/lib/types/dashboard/fearGreed";
import type { MarketSnapshot } from "@/lib/types/dashboard/marketSnapshot";
import {
  MARKET_TODAY_TITLE,
  FEAR_GREED_TITLE,
  FEAR_GREED_EXTREME_FEAR,
  FEAR_GREED_FEAR,
  FEAR_GREED_NEUTRAL,
  FEAR_GREED_GREED,
  FEAR_GREED_EXTREME_GREED,
  MARKET_SNAPSHOT_UP,
  MARKET_SNAPSHOT_DOWN,
} from "@/lib/copy/dashboard/labels";

const FEAR_GREED_LABEL_MAP: Record<FearGreedLabel, string> = {
  EXTREME_FEAR: FEAR_GREED_EXTREME_FEAR,
  FEAR: FEAR_GREED_FEAR,
  NEUTRAL: FEAR_GREED_NEUTRAL,
  GREED: FEAR_GREED_GREED,
  EXTREME_GREED: FEAR_GREED_EXTREME_GREED,
};

export interface MarketSnapshotCardProps {
  fearGreed: FearGreed;
  snapshot: MarketSnapshot;
}

export function MarketSnapshotCard({
  fearGreed,
  snapshot,
}: MarketSnapshotCardProps) {
  return (
    <section className="card" aria-label={MARKET_TODAY_TITLE}>
      <header className="mb-lg flex items-center justify-between">
        <h2 className="inline-flex items-center gap-sm text-h2 text-text-strong">
          <TrendingUp
            className="h-xl w-xl text-accent-vivid"
            aria-hidden="true"
          />
          {MARKET_TODAY_TITLE}
        </h2>
      </header>

      <div className="flex flex-col gap-lg">
        {/* Fear & Greed Index — 글로벌 컨벤션 (red→yellow→green) 유지.
         *  사유: 시장 심리 인덱스 의미 = "공포→탐욕" 글로벌 컨벤션. 한국식 등락 (signal-up/-down) 적용 시
         *  의미 충돌 (등락 의미가 아니므로 의도적 분리). Tailwind 기본 팔레트 활용. */}
        <div className="rounded-md bg-surface-muted p-lg">
          <div className="mb-sm flex items-center justify-between">
            <span className="text-body-sm-strong text-text-strong">
              {FEAR_GREED_TITLE}
            </span>
            <span className="text-body-sm-strong text-emerald-500 tabular-nums">
              {fearGreed.value} ({FEAR_GREED_LABEL_MAP[fearGreed.label]})
            </span>
          </div>
          <div className="h-[8px] w-full overflow-hidden rounded-pill bg-border-line">
            <div
              className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500"
              style={{ width: `${fearGreed.value}%` }}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* 상승/하락 종목 수 — 한국식 cascade. */}
        <div className="flex gap-md">
          <div className="flex-1 rounded-md border border-border-line p-md">
            <p className="mb-xs text-caption text-text-muted">
              {MARKET_SNAPSHOT_UP}
            </p>
            <p className="text-h1 text-signal-up tabular-nums">
              {formatNumber(snapshot.up)}
            </p>
          </div>
          <div className="flex-1 rounded-md border border-border-line p-md">
            <p className="mb-xs text-caption text-text-muted">
              {MARKET_SNAPSHOT_DOWN}
            </p>
            <p className="text-h1 text-signal-down tabular-nums">
              {formatNumber(snapshot.down)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
