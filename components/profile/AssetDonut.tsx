/**
 * AssetDonut — `/profile` "내 자산" 자산비중 도넛 차트 (SVG).
 *
 * home-market-redesign PR1 — PRD §3.1 "자산비중 막대 → 도넛 재시각화" + DESIGN.md R5.
 *
 * 디자인 정합:
 *   - 지름 168px(`donut-size`) / 링 두께 22px(`donut-thickness`) — DESIGN.md Layout 절.
 *   - 주식 = `asset-stock`(청색) / 코인 = `asset-coin`(주황) 세그먼트, 미충진 = `donut-track`(border-line).
 *   - **등락색 미사용** — 자산 분류축(주식/코인)이라 signal-up/down 안 씀(DESIGN.md Do's & Don'ts).
 *   - 가운데 "N 자산" 요약(`donut-thickness` 22px 으로 구멍 확보).
 *   - 색에만 의존하지 않게 범례 칩(`badge-asset-stock`/`badge-asset-coin`)을 호출 측에서 동반.
 *
 * 토큰 참조:
 *   - 지름: `w-donut-size h-donut-size` Tailwind 유틸리티(`donut-size` spacing 토큰) — hex/px 직타 0.
 *   - 색: `text-asset-stock` / `text-asset-coin` / `text-border-line` → SVG `stroke="currentColor"`.
 *
 * SVG arc 는 stroke-dasharray 로 세그먼트 분할. server-safe(useState 0).
 */

import { ASSET_DONUT_CENTER } from "@/lib/copy/profile/labels";

export interface AssetDonutProps {
  /** 주식 비중 (백분율, 0~100). */
  stockPct: number;
  /** 코인 비중 (백분율, 0~100). */
  cryptoPct: number;
  /** 가운데 표기할 자산 종류 수(예: 2). */
  assetCount: number;
}

// 뷰박스 좌표계 — 지름·두께는 동일 비율(100 단위)로 두고 실제 px 는 width/height(토큰)로 스케일.
// stroke 좌표는 단위 무관(비율)이라 100×100 뷰박스 + 반지름 r 로 둘레 계산.
const VIEWBOX = 100;
const STROKE = 26; // 22/168 ≈ 13% → 뷰박스 100 기준 ~26 으로 시각 두께 정합(토큰 px 은 width 로 적용).
const R = (VIEWBOX - STROKE) / 2;
const CX = VIEWBOX / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

export function AssetDonut({ stockPct, cryptoPct, assetCount }: AssetDonutProps) {
  // 세그먼트 dash 길이 — 비율 → 둘레 길이.
  const stockLen = (Math.max(0, stockPct) / 100) * CIRCUMFERENCE;
  const cryptoLen = (Math.max(0, cryptoPct) / 100) * CIRCUMFERENCE;
  // 코인 세그먼트는 주식 세그먼트 뒤에 이어 그린다(offset 으로 시작점 이동).
  const cryptoOffset = -stockLen;

  return (
    <div className="relative h-donut-size w-donut-size shrink-0">
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        className="h-full w-full -rotate-90"
        role="img"
        aria-label={`${ASSET_DONUT_CENTER} ${assetCount}`}
      >
        {/* 트랙(미충진) */}
        <circle
          cx={CX}
          cy={CX}
          r={R}
          fill="none"
          className="text-border-line"
          stroke="currentColor"
          strokeWidth={STROKE}
        />
        {/* 주식 세그먼트 */}
        <circle
          cx={CX}
          cy={CX}
          r={R}
          fill="none"
          className="text-asset-stock"
          stroke="currentColor"
          strokeWidth={STROKE}
          strokeDasharray={`${stockLen} ${CIRCUMFERENCE - stockLen}`}
          strokeLinecap="butt"
        />
        {/* 코인 세그먼트 */}
        <circle
          cx={CX}
          cy={CX}
          r={R}
          fill="none"
          className="text-asset-coin"
          stroke="currentColor"
          strokeWidth={STROKE}
          strokeDasharray={`${cryptoLen} ${CIRCUMFERENCE - cryptoLen}`}
          strokeDashoffset={cryptoOffset}
          strokeLinecap="butt"
        />
      </svg>
      {/* 가운데 "N 자산" 요약 — 색이 보조축, 텍스트가 정본. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-h1 text-text-strong tabular-nums">{assetCount}</span>
        <span className="text-caption text-text-muted">{ASSET_DONUT_CENTER}</span>
      </div>
    </div>
  );
}
