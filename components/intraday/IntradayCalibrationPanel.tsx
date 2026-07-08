/**
 * IntradayCalibrationPanel — 틱 자가채점 라벨 요약 + 수동 라벨링(관리자). intraday-decision-overhaul PR-2.
 *
 * /intraday 하단 컴팩트 패널. 출처(AI 판단/결정론 폴백)×판단 액션 버킷의 익절·손절·만료·미확정
 * 카운트와 평균수익률, 시그널 점수대 밴드를 표로 보여주고 "라벨링 실행"으로 완료 세션을 백필한다.
 *
 * 노출 규칙은 페이지·메뉴와 동일(prod=admin+ · 로컬=전체) — 데이터도 BFF(requireProdAdminApi)가
 * 이중 방어하므로 UI 게이트는 표시용이다. 카드리스(헤어라인 구분) 토스톤, 신규 토큰 없음.
 */

"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { useMe } from "@/hooks/auth/useMe";
import { useTickLabels } from "@/hooks/intraday/useTickLabels";
import { INTRADAY_CALIBRATION_COPY as C } from "@/lib/copy/stock/intradayRead";
import { cn } from "@/lib/utils/cn";
import { formatPct } from "@/lib/utils/formatPct";
import { isVercelRuntime } from "@/lib/utils/runtimeEnv";
import type { IntradayLabelCounts } from "@/lib/types/intraday/tickLabels";

/** 표 1행 공용 뷰모델 — 출처×액션 버킷과 점수대 밴드가 같은 컬럼 구성을 공유한다. */
type LabelRowView = {
  key: string;
  name: string;
  counts: IntradayLabelCounts;
  avgReturnPct: number | null;
};

export function IntradayCalibrationPanel() {
  const { isAdmin } = useMe();
  // 페이지 게이트와 동일 규칙 — prod 는 admin+ 만, 로컬(dev)은 전체(라벨링 실행 환경이 로컬).
  const visible = !isVercelRuntime() || isAdmin;
  const { summary, isLoading, isError, run, isRunning, runResult } = useTickLabels(visible);
  if (!visible) return null;

  const buckets: LabelRowView[] = (summary?.buckets ?? []).map((b) => ({
    key: `${b.source}|${b.action}`,
    name: `${C.source[b.source]} · ${C.actionLabel[b.action] ?? b.action}`,
    counts: b.counts,
    avgReturnPct: b.avgReturnPct,
  }));
  const bands: LabelRowView[] = (summary?.scoreBands ?? []).map((b) => ({
    key: b.band,
    name: C.band[b.band],
    counts: b.counts,
    avgReturnPct: b.avgReturnPct,
  }));

  return (
    <section className="flex flex-col gap-sm" aria-label={C.title}>
      <Divider />
      <div className="flex flex-wrap items-center gap-sm">
        <h2 className="text-body-md font-bold text-text-strong">{C.title}</h2>
        <Badge variant="info">{C.badge}</Badge>
        <Button
          variant="secondary"
          size="sm"
          loading={isRunning}
          onClick={run}
          className="ml-auto"
          title={C.runHint}
        >
          {isRunning ? C.running : C.run}
        </Button>
      </div>
      <p className="text-caption text-text-muted">{C.subtitle}</p>
      {runResult ? <p className="text-caption text-accent-vivid">{C.result(runResult)}</p> : null}

      {isLoading ? (
        <p className="text-body-sm text-text-muted">{C.loading}</p>
      ) : isError ? (
        <p className="text-body-sm text-text-muted">{C.error}</p>
      ) : summary && !summary.configured ? (
        <p className="text-body-sm text-text-muted">{C.unconfigured}</p>
      ) : summary && summary.total === 0 ? (
        <p className="text-body-sm text-text-muted">{C.empty}</p>
      ) : summary ? (
        <div className="flex flex-col gap-sm">
          <span className="text-caption text-text-muted">
            {C.totalLabel} {summary.total.toLocaleString("ko-KR")}건
          </span>
          <LabelTable rows={buckets} bucketHeader={C.table.colBucket} />
          {bands.length > 0 ? (
            <>
              <h3 className="text-body-sm font-bold text-text-strong">{C.bandsTitle}</h3>
              <LabelTable rows={bands} bucketHeader={C.bandsTitle} />
            </>
          ) : null}
          <p className="text-caption text-text-muted">{C.staleNote}</p>
        </div>
      ) : null}
    </section>
  );
}

/** 라벨 카운트 표 — 넓은 컬럼은 자체 가로 스크롤(페이지 가로 스크롤 금지). */
function LabelTable({ rows, bucketHeader }: { rows: LabelRowView[]; bucketHeader: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] text-body-sm">
        <thead>
          <tr className="border-b border-border-line text-caption text-text-muted">
            <th className="py-xs pr-md text-left font-normal">{bucketHeader}</th>
            <th className="py-xs px-sm text-right font-normal">{C.table.colWin}</th>
            <th className="py-xs px-sm text-right font-normal">{C.table.colLoss}</th>
            <th className="py-xs px-sm text-right font-normal">{C.table.colNeutral}</th>
            <th className="py-xs px-sm text-right font-normal">{C.table.colUnresolved}</th>
            <th className="py-xs pl-sm text-right font-normal">{C.table.colAvgReturn}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-border-line">
              <td className="py-xs pr-md text-text-strong">{row.name}</td>
              <td className="py-xs px-sm text-right tabular-nums text-signal-up">
                {row.counts.WIN}
              </td>
              <td className="py-xs px-sm text-right tabular-nums text-signal-down">
                {row.counts.LOSS}
              </td>
              <td className="py-xs px-sm text-right tabular-nums text-text-muted">
                {row.counts.NEUTRAL}
              </td>
              <td className="py-xs px-sm text-right tabular-nums text-text-muted">
                {row.counts.UNRESOLVED}
              </td>
              <td
                className={cn(
                  "py-xs pl-sm text-right tabular-nums",
                  row.avgReturnPct === null
                    ? "text-text-muted"
                    : row.avgReturnPct > 0
                      ? "text-signal-up"
                      : row.avgReturnPct < 0
                        ? "text-signal-down"
                        : "text-text-muted",
                )}
              >
                {formatPct(row.avgReturnPct, { digits: 2, sign: true })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
