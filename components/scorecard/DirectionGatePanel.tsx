/**
 * DirectionGatePanel — 방향 적중 vs 찍기 점수 운영자 표시(참고 지표 — 오픈베타 조건 아님, ai-direction-quality §10).
 *
 * 강세군·약세군 각각 2주 뒤 방향 적중률을 같은 표본의 찍기 점수와 나란히 두고 기준 통과 여부를 보인다.
 * 판정 색은 등락색이 아닌 채점 톤(통과=outcome-hit / 미달=warn / 표본 부족=muted).
 */

import { cn } from "@/lib/utils/cn";
import type { DirectionGate, DirectionGateSide } from "@/lib/types/scorecard/scorecard";
import {
  GATE_BASE_NOTE,
  GATE_COL_BASE,
  GATE_COL_DIFF,
  GATE_COL_HIT_RATE,
  GATE_COL_N,
  GATE_COL_RESULT,
  GATE_COL_SIDE,
  GATE_REFERENCE_NOTE,
  GATE_RESULT,
  GATE_SIDE_HINT,
  GATE_SIDE_LABEL,
  GATE_TITLE,
  HIT_RATE_NA,
  gateCriteria,
  gateHeadline,
} from "@/lib/copy/scorecard/labels";

const pct = (v: number | null) => (v === null ? HIT_RATE_NA : `${Math.round(v * 100)}%`);
const pp = (v: number | null) => {
  if (v === null) return HIT_RATE_NA;
  const r = Math.round(v * 10) / 10; // 부호는 반올림 결과 기준 — "−0.0%p" 방지.
  return `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r).toFixed(1)}%p`;
};

function resultOf(side: DirectionGateSide): keyof typeof GATE_RESULT {
  if (!side.enoughSample) return "pending";
  return side.pass ? "pass" : "fail";
}

const RESULT_TONE = {
  pass: "text-outcome-hit",
  fail: "text-warn",
  pending: "text-text-muted",
} as const;

/** 전체 판정 — 한쪽이라도 표본 충분한데 미달이면 미달, 그 외 표본 부족이 있으면 보류. */
function overallOf(gate: DirectionGate): keyof typeof GATE_RESULT {
  if (gate.pass) return "pass";
  const sides = [gate.bull, gate.bear];
  if (sides.some((s) => s.enoughSample && !s.pass)) return "fail";
  return "pending";
}

export function DirectionGatePanel({ gate }: { gate: DirectionGate }) {
  const sides = [
    ["bull", gate.bull],
    ["bear", gate.bear],
  ] as const;
  const overall = overallOf(gate);

  return (
    <section className="flex flex-col gap-xs" aria-labelledby="direction-gate-title">
      <div className="flex flex-wrap items-baseline gap-x-md gap-y-xs">
        <h2 id="direction-gate-title" className="text-body-md font-bold text-text-strong">
          {GATE_TITLE}
        </h2>
        <span className={cn("text-body-sm font-medium", RESULT_TONE[overall])}>
          {gateHeadline(overall, gate.sample)}
        </span>
      </div>
      <p className="text-caption text-text-muted">{GATE_REFERENCE_NOTE}</p>
      <p className="text-caption text-text-muted">{gateCriteria(gate.marginPp, gate.minN)}</p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border-line">
              <th scope="col" className="py-md pr-md text-left text-label-sm text-text-muted">
                {GATE_COL_SIDE}
              </th>
              {[GATE_COL_N, GATE_COL_HIT_RATE, GATE_COL_BASE, GATE_COL_DIFF, GATE_COL_RESULT].map(
                (label) => (
                  <th
                    key={label}
                    scope="col"
                    className="py-md pl-md text-right text-label-sm text-text-muted whitespace-nowrap"
                  >
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {sides.map(([key, side]) => {
              const result = resultOf(side);
              return (
                <tr key={key} className="border-b border-border-line last:border-b-0">
                  <th
                    scope="row"
                    className="py-md pr-md text-left text-body-sm font-normal text-text-strong whitespace-nowrap"
                    title={GATE_SIDE_HINT[key]}
                  >
                    {GATE_SIDE_LABEL[key]}
                  </th>
                  <td className="py-md pl-md text-right text-body-sm tabular-nums">{side.n}</td>
                  <td className="py-md pl-md text-right text-body-sm-strong tabular-nums text-text-strong">
                    {pct(side.hitRate)}
                  </td>
                  <td className="py-md pl-md text-right text-body-sm tabular-nums text-text-muted">
                    {pct(side.baseRate)}
                  </td>
                  <td className="py-md pl-md text-right text-body-sm tabular-nums">
                    {pp(side.diffPp)}
                  </td>
                  <td
                    className={cn(
                      "py-md pl-md text-right text-body-sm font-medium whitespace-nowrap",
                      RESULT_TONE[result],
                    )}
                  >
                    {GATE_RESULT[result]}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-caption text-text-muted">{GATE_BASE_NOTE}</p>
    </section>
  );
}
