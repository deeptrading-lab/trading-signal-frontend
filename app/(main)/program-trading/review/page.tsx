import { ArrowLeft } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { ProgramTradingEvaluation, ProgramTradingEvaluationStatus } from "@/components/programTrading/ProgramTradingEvaluation";
import { AccessDeniedView } from "@/components/layout/AccessDeniedView";
import { ProgramTradingPerformance } from "@/components/programTrading/ProgramTradingPerformance";
import { ProgramTradingReviewTable } from "@/components/programTrading/ProgramTradingReviewTable";
import { PROGRAM_REVIEW_COPY as C } from "@/lib/copy/programTrading/programTrading";
import { allowsLocalProgramHost } from "@/lib/server/programTrading/localRequest";
import { loadPaperReviews } from "@/lib/server/programTrading/sessionStorage";
import { cn } from "@/lib/utils/cn";

const archiveTime = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul",
});

export default async function ProgramTradingReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string | string[] }>;
}) {
  if (!allowsLocalProgramHost((await headers()).get("host"))) return <AccessDeniedView />;

  const { session } = await searchParams;
  const result = await loadPaperReviews(typeof session === "string" ? session : undefined, { includePerformance: true }).catch(() => null);

  const finishedAt = result?.review?.lifecycle.finishedAt;
  const sessionLinks = result && (
    <ul className="max-h-64 space-y-xs overflow-y-auto lg:max-h-96">
      {result.sessions.map(({ id, archivedAt }) => (
        <li key={id}>
          <Link href={{ pathname: "/program-trading/review", query: { session: id } }}
            aria-current={result.selectedId === id ? "page" : undefined} prefetch={false}
            className={cn("block min-h-hit-area-min break-keep rounded-lg border border-transparent px-md py-sm text-body-sm text-text-strong no-underline hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary", result.selectedId === id
              && "border-primary bg-surface-muted font-semibold")}>
            {archivedAt ? <>{C.archived} · <time dateTime={archivedAt}>{archiveTime.format(new Date(archivedAt))}</time></> : C.current}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="mx-auto flex min-w-0 w-full max-w-main-max-w flex-col gap-xl font-(family-name:--font-pretendard)">
      <header className="flex flex-wrap items-center justify-between gap-sm">
        <div className="space-y-xs">
          <h1 className="text-h1 font-bold text-text-strong">{C.title}</h1>
          {finishedAt && Number.isFinite(Date.parse(finishedAt)) && (
            <p className="text-body-sm text-text-muted">{C.finished} · <time dateTime={finishedAt}>{archiveTime.format(new Date(finishedAt))}</time></p>
          )}
        </div>
        <Link href="/program-trading" className="button-secondary program-trading-action whitespace-nowrap no-underline">
          <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
          {C.back}
        </Link>
      </header>

      {result ? (
        <div className="grid min-w-0 gap-lg lg:grid-cols-[minmax(0,1fr)_14rem]">
          {(result.sessions.length > 1 || (result.sessions.length > 0 && !result.review)) && (
            <details className="rounded-lg border border-border-line bg-surface p-md lg:hidden">
              <summary className="min-h-hit-area-min cursor-pointer rounded-md py-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary text-body-sm font-semibold text-text-strong">{C.changeSession}</summary>
              <nav aria-label={C.sessions} className="mt-sm">{sessionLinks}</nav>
            </details>
          )}
          <div className="min-w-0 space-y-lg lg:col-start-1 lg:row-start-1">
            {result.review ? (
              <>
                <Suspense fallback={<ProgramTradingEvaluationStatus message={C.evaluationLoading} />}>
                  <ProgramTradingEvaluation startedAt={result.review.lifecycle.startedAt} />
                </Suspense>
                <ProgramTradingReviewTable review={result.review} />
              </>
            ) : <p className="rounded-lg border border-border-line bg-surface p-lg text-body-sm text-text-muted">
              {result.sessions.length ? C.unavailable : C.empty}
            </p>}
            <ProgramTradingPerformance points={result.performance} selectedId={result.selectedId} />
          </div>
          {result.sessions.length > 0 && (
            <nav aria-label={C.sessions} className="hidden h-fit min-w-0 space-y-sm rounded-lg border border-border-line bg-surface p-md lg:sticky lg:top-lg lg:col-start-2 lg:row-start-1 lg:block">
              <h2 className="text-body-md font-semibold text-text-strong">{C.sessions}</h2>
              {sessionLinks}
            </nav>
          )}
        </div>
      ) : <p role="alert" className="text-body-sm text-text-muted">{C.error}</p>}
    </div>
  );
}
