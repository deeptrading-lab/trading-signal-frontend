import type { ReactNode } from "react";
import { ProgramTradingImproveButton } from "./ProgramTradingImproveButton";
import { ProgramTradingInfo } from "./ProgramTradingInfo";
import { PROGRAM_REVIEW_COPY as C } from "@/lib/copy/programTrading/programTrading";
import { listPaperReviewEvents, paperResultId } from "@/lib/server/programTrading/reviewHistory";

const reviewTime = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul",
});

function EvaluationSection({ children }: { children: ReactNode }) {
  return (
    <section aria-labelledby="session-evaluation" className="min-w-0 space-y-sm border-t border-border-line pt-sm">
      <div className="relative flex items-center">
        <h2 id="session-evaluation" className="text-h2 font-bold text-text-strong">{C.evaluation}</h2>
        <ProgramTradingInfo label={C.evaluation} description={C.evaluationHint} />
      </div>
      {children}
    </section>
  );
}

export function ProgramTradingEvaluationStatus({ message }: { message: string }) {
  return <EvaluationSection><p role="status" className="break-keep text-body-sm text-text-muted">{message}</p></EvaluationSection>;
}

function EventTime({ value }: { value: string }) {
  return <time dateTime={value} className="text-caption text-text-muted">{reviewTime.format(new Date(value))}</time>;
}

function Findings({ items }: { items: string[] }) {
  return <ul className="list-disc space-y-xs pl-lg">{items.map((item, index) => <li key={index}>{item}</li>)}</ul>;
}

export async function ProgramTradingEvaluation({ startedAt, canApply }: { startedAt: string | null; canApply: boolean }) {
  const sessionId = startedAt ? paperResultId(startedAt) : null;
  const history = sessionId ? await listPaperReviewEvents(sessionId).catch(() => null) : [];
  if (history === null) return <ProgramTradingEvaluationStatus message={C.evaluationError} />;

  const [latest, ...previous] = history.filter(event => event.kind === "evaluation");
  const applied = history.filter(event => event.kind === "applied");
  const latestApplied = applied.find(event => "evaluationId" in event.details && event.details.evaluationId === latest?.id);
  return (
    <EvaluationSection>
      {latest ? (
        <>
          <div className="grid gap-md md:grid-cols-2">
            <div className="min-w-0 space-y-sm">
              <h3 className="text-body-md font-semibold text-text-strong">{C.evaluationDecision}</h3>
              <p className="wrap-anywhere break-keep text-body-md text-text-strong">{latest.details.summary}</p>
              <div className="flex flex-wrap items-center gap-x-sm gap-y-xs">
                <span className="text-body-sm font-semibold tabular-nums text-primary">{C.evaluationScore(latest.score)}</span>
                <EventTime value={latest.created_at} />
              </div>
            </div>
            <div className="min-w-0 space-y-sm border-t border-border-line pt-md md:border-t-0 md:border-l md:pt-0 md:pl-md">
              <h3 className="text-body-md font-semibold text-text-strong">{latestApplied ? C.improveApplied : C.evaluationPlan}</h3>
              {latestApplied ? (
                <>
                  <p className="wrap-anywhere break-keep text-body-sm text-text-strong">{latestApplied.details.description}</p>
                  {canApply && <p className="break-keep text-body-sm text-text-muted">{C.improveRestart}</p>}
                  {latest.details.proposals.length > 0 && (
                    <details className="wrap-anywhere text-body-sm text-text-muted">
                      <summary className="min-h-hit-area-min cursor-pointer rounded-md py-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary font-semibold text-text-strong">{C.evaluationProposed}</summary>
                      <Findings items={latest.details.proposals} />
                    </details>
                  )}
                </>
              ) : (
                <>
                  <div className="wrap-anywhere break-keep text-body-sm text-text-strong">
                    {latest.details.proposals.length ? <Findings items={latest.details.proposals} /> : <p>{C.evaluationNoPlan}</p>}
                  </div>
                  {canApply && sessionId && latest.details.proposals.length > 0 && (
                    <ProgramTradingImproveButton key={latest.id} sessionId={sessionId} evaluationId={latest.id} applied={false} />
                  )}
                </>
              )}
            </div>
          </div>
          {latest.details.limitations.length > 0 && (
            <details className="space-y-sm border-t border-border-line pt-sm text-body-sm text-text-muted">
              <summary className="min-h-hit-area-min cursor-pointer rounded-md py-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary font-semibold text-text-strong">{C.evaluationLimitations}</summary>
              <Findings items={latest.details.limitations} />
            </details>
          )}
        </>
      ) : <p className="text-body-sm text-text-muted">{C.evaluationPending}</p>}
      {applied.length > 0 && (
        <details className="space-y-sm border-t border-border-line pt-sm text-body-sm">
          <summary className="min-h-hit-area-min cursor-pointer rounded-md py-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary font-semibold text-text-strong">{C.evaluationApplied} · {applied.length}{C.countUnit}</summary>
          <ul className="space-y-sm">
            {applied.map(({ id, created_at, details }) => (
              <li key={id} className="wrap-anywhere">
                <p className="text-text-strong">{details.description}</p>
                <p className="flex flex-wrap gap-x-sm text-caption text-text-muted">
                  <code>{(details.revision ?? details.patchId).slice(0, 12)}</code>
                  <EventTime value={created_at} />
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
      {previous.length > 0 && (
        <details className="space-y-sm border-t border-border-line pt-sm text-body-sm">
          <summary className="min-h-hit-area-min cursor-pointer rounded-md py-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary font-semibold text-text-strong">{C.evaluationHistory} · {previous.length}{C.countUnit}</summary>
          <ul className="divide-y divide-border-line">
            {previous.map(({ id, score, created_at, details }) => (
              <li key={id} className="wrap-anywhere space-y-xs py-sm text-text-strong">
                <EventTime value={created_at} />
                <p className="font-semibold">{C.evaluationScore(score)}</p>
                <p>{details.summary}</p>
                {details.proposals.length > 0 && <><h3 className="font-semibold">{C.evaluationProposals}</h3><Findings items={details.proposals} /></>}
                {details.limitations.length > 0 && <><h3 className="font-semibold">{C.evaluationLimitations}</h3><Findings items={details.limitations} /></>}
              </li>
            ))}
          </ul>
        </details>
      )}
      {history.length === 20 && <p className="text-caption text-text-muted">{C.evaluationRecent}</p>}
    </EvaluationSection>
  );
}
