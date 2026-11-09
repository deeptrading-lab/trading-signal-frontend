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
    [M.profit, formatWon(balanceChange)],
    [M.returns, lifecycle.returnPct == null ? M.noBalance : formatPct(lifecycle.returnPct, { digits: 2, sign: true })],
    [M.target, formatPct(lifecycle.targetReturnPct, { digits: 2 })],
    [C.closedTrades, `${formatNumber(closedTrades, { digits: 0 })}${C.countUnit}`],
    [C.decision, decision === "keep" ? C.achieved : decision === "review" ? C.missed : M.noBalance],
  ] as const;

  return (
    <section className="min-w-0 space-y-md" aria-labelledby="session-summary">
      <h2 id="session-summary" className="text-body-md font-semibold text-text-strong">{C.summary}</h2>
      <div className="overflow-hidden rounded-lg border border-border-line bg-surface">
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
                <td className="break-keep px-md py-sm text-right tabular-nums">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!audit && proposals.length > 0 && (
        <div className="rounded-lg border border-border-line bg-surface p-md">
          <h3 className="text-body-sm font-semibold text-text-strong">{C.proposals}</h3>
          <ul className="mt-xs list-disc space-y-xs break-keep pl-lg text-body-sm text-text-muted">
            {proposals.map(proposal => <li key={proposal}>{proposal}</li>)}
          </ul>
        </div>
      )}
      <div className="space-y-sm" aria-labelledby="session-audit">
        <h3 id="session-audit" className="text-body-md font-semibold text-text-strong">{C.audit}</h3>
        {audit ? (
          <>
            <p className="break-keep text-caption text-text-muted">{C.auditCode} · {audit.codeReference}</p>
            {auditGroups.filter(([, findings]) => findings.length > 0).map(([label, findings]) => (
              <section key={label} className="space-y-sm rounded-lg border border-border-line bg-surface p-md">
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
      </div>
    </section>
  );
}
