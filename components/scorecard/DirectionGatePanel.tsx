/**
 * DirectionGatePanel — 오픈베타 전환 기준(방향 적중 vs 찍기 점수) 운영자 표시.
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
  GATE_RESULT,
  GATE_SIDE_LABEL,
  GATE_TITLE,
  HIT_RATE_NA,
  gateCriteria,
  gateHeadline,
} from "@/lib/copy/scorecard/labels";

const pct = (v: number | null) => (v === null ? HIT_RATE_NA : `${Math.round(v * 100)}%`);
const pp = (v: number | null) =>
  v === null ? HIT_RATE_NA : `${v > 0 ? "+" : ""}${v.toFixed(1)}%p`;

function resultOf(side: DirectionGateSide): keyof typeof GATE_RESULT {
  if (!side.enoughSample) return "pending";
  return side.pass ? "pass" : "fail";
}

const RESULT_TONE = {
  pass: "text-outcome-hit",
  fail: "text-warn",
  pending: "text-text-muted",
} as const;

export function DirectionGatePanel({ gate }: { gate: DirectionGate }) {
  const sides = [
    ["bull", gate.bull],
    ["bear", gate.bear],
  ] as const;

  return (
    <section className="flex flex-col gap-xs" aria-label={GATE_TITLE}>
      <div className="flex flex-wrap items-baseline gap-x-md gap-y-xs">
        <h2 className="text-body-md font-bold text-text-strong">{GATE_TITLE}</h2>
        <span
          className={cn("text-body-sm font-medium", gate.pass ? "text-outcome-hit" : "text-warn")}
        >
          {gateHeadline(gate.pass, gate.sample)}
        </span>
      </div>
      <p className="text-caption text-text-muted">{gateCriteria(gate.marginPp, gate.minN)}</p>

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
                  className="py-md pr-md text-left text-body-sm font-normal text-text-strong"
                >
                  {GATE_SIDE_LABEL[key]}
                </th>
                <td className="py-md pl-md text-right text-body-sm tabular-nums">
                  {side.n}/{gate.minN}
                </td>
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
      <p className="text-caption text-text-muted">{GATE_BASE_NOTE}</p>
    </section>
  );
}
