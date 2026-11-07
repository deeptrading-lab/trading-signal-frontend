/**
 * SwingForwardPanel — 관리자 화면의 스윙 체크 사후 성적(전진 관찰) 표.
 *
 * 행 = 묶음(매수 후보·관심·수급 충족·주의 …), 열 = 1·5·10 거래일 뒤. 셀 = 시장 대비 평균 초과 + 이긴 비율·건수.
 * 오픈베타 기준 재제안(약 8주 뒤)의 근거 데이터.
 */

"use client";

import { useQuerySwingForward } from "@/hooks/swing/useQuerySwingForward";
import { FORWARD_GROUPS } from "@/lib/swing/forward";
import { cn } from "@/lib/utils/cn";
import {
  SWING_FORWARD_DESC,
  SWING_FORWARD_ERROR,
  SWING_FORWARD_GROUP,
  SWING_FORWARD_GROUP_LABEL,
  SWING_FORWARD_LOADING,
  SWING_FORWARD_TITLE,
  SWING_RETRY,
  swingForwardBasis,
  swingForwardCell,
  swingForwardHorizon,
} from "@/lib/copy/swing/labels";

export function SwingForwardPanel() {
  const { data, isLoading, isError, refetch } = useQuerySwingForward();
  const longest = data?.horizons.find((h) => h.firstBase) ?? data?.horizons[0];

  return (
    <section className="mx-auto flex w-full max-w-main-max-w flex-col gap-lg px-lg pb-xl">
      <header className="flex flex-col gap-xs">
        <h2 className="text-h2 text-text-strong">{SWING_FORWARD_TITLE}</h2>
        <p className="text-body-sm text-text-muted">{SWING_FORWARD_DESC}</p>
        {data && longest ? (
          <p className="text-caption text-text-muted">{swingForwardBasis(data.latest, longest.firstBase, longest.lastBase)}</p>
        ) : null}
      </header>

      {isLoading ? (
        <p className="text-body-sm text-text-muted">{SWING_FORWARD_LOADING}</p>
      ) : isError || !data ? (
        <div className="flex flex-col items-start gap-sm">
          <p className="text-body-sm text-critical">{SWING_FORWARD_ERROR}</p>
          <button type="button" className="button-secondary" onClick={() => refetch()}>
            {SWING_RETRY}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border-line">
          <table className="w-full min-w-[36rem] text-body-sm">
            <thead className="bg-surface-muted text-caption text-text-muted">
              <tr>
                <th scope="col" className="px-md py-sm text-left font-normal">
                  {SWING_FORWARD_GROUP}
                </th>
                {data.horizons.map((h) => (
                  <th key={h.horizon} scope="col" className="px-md py-sm text-right font-normal">
                    {swingForwardHorizon(h.horizon)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-line">
              {FORWARD_GROUPS.map((g) => (
                <tr key={g}>
                  <th scope="row" className="px-md py-sm text-left font-bold text-text-strong">
                    {SWING_FORWARD_GROUP_LABEL[g]}
                  </th>
                  {data.horizons.map((h) => {
                    const c = h.cells.find((x) => x.group === g)!;
                    const { main, sub } = swingForwardCell(c.meanExcess, c.winRate, c.n);
                    return (
                      <td key={h.horizon} className="px-md py-sm text-right tabular-nums">
                        <span
                          className={cn(
                            "block font-bold",
                            c.meanExcess === null || g === "all"
                              ? "text-text-muted"
                              : c.meanExcess > 0
                                ? "text-outcome-hit"
                                : "text-warn",
                          )}
                        >
                          {main}
                        </span>
                        <span className="block text-caption text-text-muted">{sub}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
