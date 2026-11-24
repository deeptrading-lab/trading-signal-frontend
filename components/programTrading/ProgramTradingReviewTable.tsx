import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { PROGRAM_MENU_COPY as M, PROGRAM_REVIEW_COPY as C } from "@/lib/copy/programTrading/programTrading";
import type { PaperSessionReview } from "@/lib/types/programTrading/programTrading";
import { formatNumber } from "@/lib/utils/formatMoney";
import { formatPct } from "@/lib/utils/formatPct";

const sessionTime = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul",
});

function formatTime(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return M.noBalance;
  return <time dateTime={value}>{sessionTime.format(new Date(value))}</time>;
}

function formatWon(value: number | null) {
  return Number.isFinite(value) ? `${formatNumber(value, { digits: 0 })}원` : M.noBalance;
}

function ReviewDetails({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group border-t border-border-line">
      <summary className="flex min-h-hit-area-min cursor-pointer list-none items-center justify-between gap-sm py-sm text-body-sm font-semibold text-text-strong focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-text-muted group-open:rotate-180" />
      </summary>
      <div className="space-y-sm pb-sm">{children}</div>
    </details>
  );
}

export function ProgramTradingReviewTable({ review }: { review: PaperSessionReview }) {
  const { lifecycle, balanceChange, closedTrades, decision, proposals } = review;
  const audit = review.audit;
  const auditGroups = audit ? [
    [C.auditVerified, audit.verified],
    [C.auditIssues, audit.issues],
    [C.auditUnverified, audit.unverified],
    [C.auditHypotheses, audit.hypotheses],
  ] as const : [];
  const rows = [
    [C.started, formatTime(lifecycle.startedAt)],
    [C.finished, formatTime(lifecycle.finishedAt)],
    [M.initial, formatWon(lifecycle.beforeBalance)],
    [M.final, formatWon(lifecycle.afterBalance)],
    [M.target, formatPct(lifecycle.targetReturnPct, { digits: 2 })],
    [C.decision, decision === "keep" ? C.achieved : decision === "review" ? C.missed : M.noBalance],
  ] as const;

  const metrics = [
    [M.returns, lifecycle.returnPct == null ? M.noBalance : formatPct(lifecycle.returnPct, { digits: 2, sign: true }), lifecycle.returnPct],
    [M.profit, formatWon(balanceChange), balanceChange],
    [C.closedTrades, `${formatNumber(closedTrades, { digits: 0 })}${C.countUnit}`, null],
  ] as const;

  return (
    <section className="min-w-0 space-y-sm border-t border-border-line pt-md" aria-labelledby="session-summary">
      <h2 id="session-summary" className="text-h2 font-bold text-text-strong">{C.summary}</h2>
      <dl className="grid grid-cols-2 gap-px border-y border-border-line bg-border-line sm:grid-cols-3">
        {metrics.map(([label, value, direction]) => (
          <div key={label} className="min-w-0 bg-surface p-sm last:col-span-2 sm:p-md sm:last:col-span-1">
            <dt className="text-body-sm text-text-muted">{label}</dt>
            <dd className={cn("mt-xs wrap-anywhere text-body-md font-bold tabular-nums text-text-strong sm:text-h2",
              direction != null && direction > 0 && "text-signal-up",
              direction != null && direction < 0 && "text-signal-down")}>{value}</dd>
          </div>
        ))}
      </dl>
      <ReviewDetails title={C.resultDetails}>
        <table aria-labelledby="session-summary" className="w-full border-collapse text-body-sm">
          <thead className="bg-surface-muted text-text-muted">
            <tr>
              <th scope="col" className="px-md py-sm text-left font-semibold">{C.item}</th>
              <th scope="col" className="px-md py-sm text-right font-semibold">{C.result}</th>
            </tr>
          </thead>
          <tbody className="text-text-strong">
            {rows.map(([label, value]) => (
              <tr key={label} className="border-t border-border-line">
                <th scope="row" className="w-2/5 px-md py-sm text-left font-medium">{label}</th>
                <td className="wrap-anywhere px-md py-sm text-right tabular-nums">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReviewDetails>
      {!audit && proposals.length > 0 && (
        <div className="border-t border-border-line pt-sm">
          <h3 className="text-body-sm font-semibold text-text-strong">{C.proposals}</h3>
          <ul className="mt-xs list-disc space-y-xs break-keep pl-lg text-body-sm text-text-muted">
            {proposals.map(proposal => <li key={proposal}>{proposal}</li>)}
          </ul>
        </div>
      )}
      <ReviewDetails title={C.audit}>
        {audit ? (
          <>
            <p className="break-keep text-caption text-text-muted">{C.auditCode} · {audit.codeReference}</p>
            {auditGroups.filter(([, findings]) => findings.length > 0).map(([label, findings]) => (
              <section key={label} className="space-y-sm border-t border-border-line py-sm">
                <h4 className="text-body-sm font-semibold text-text-strong">{label}</h4>
                <ul className="space-y-sm break-keep text-body-sm">
                  {findings.map(({ title, evidence }) => (
                    <li key={title} className="space-y-xs">
                      <p className="font-medium text-text-strong">{title}</p>
                      <p className="wrap-anywhere text-text-muted">{evidence}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        ) : <p className="text-body-sm text-text-muted">{C.auditPending}</p>}
      </ReviewDetails>
    </section>
  );
}
