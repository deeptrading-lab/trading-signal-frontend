import { ArrowLeft } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { ProgramTradingEvaluation, ProgramTradingEvaluationStatus } from "@/components/programTrading/ProgramTradingEvaluation";
import { hasServerRole } from "@/lib/auth/serverGuard";
import { AccessDeniedView } from "@/components/layout/AccessDeniedView";
import { ProgramTradingPerformance } from "@/components/programTrading/ProgramTradingPerformance";
import { ProgramTradingReviewTable } from "@/components/programTrading/ProgramTradingReviewTable";
import { PROGRAM_REVIEW_COPY as C } from "@/lib/copy/programTrading/programTrading";
import { allowsLocalProgramHost } from "@/lib/server/programTrading/localRequest";
import { paperResultPageSize } from "@/lib/server/programTrading/reviewHistory";
import { loadSharedPaperReviews } from "@/lib/server/programTrading/sharedReviews";
import { loadPaperReviews } from "@/lib/server/programTrading/sessionStorage";
import { cn } from "@/lib/utils/cn";

const reviewPath = "/program-trading/review";

const archiveTime = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul",
});

export default async function ProgramTradingReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string | string[]; source?: string; offset?: string }>;
}) {
  const local = allowsLocalProgramHost((await headers()).get("host"));
  if (!local && !(await hasServerRole("admin"))) return <AccessDeniedView />;

  const { session, source, offset: requestedOffset } = await searchParams;
  const sessionId = typeof session === "string" ? session : undefined;
  const offset = typeof requestedOffset === "string" && /^\d{1,8}$/.test(requestedOffset)
    ? Number(requestedOffset) : 0;
  const localResult = local && source !== "shared"
    ? await loadPaperReviews(sessionId, { includePerformance: true }).catch(() => null)
    : null;
  const shared = !local || source === "shared" || (source !== "local" && !sessionId && !localResult?.sessions.length);
  const sharedResult = shared ? await loadSharedPaperReviews(sessionId, offset).catch(() => null) : null;
  const result = shared ? sharedResult : localResult;
  const pagination = shared && (offset > 0 || sharedResult?.hasNext) && (
    <div className="flex flex-wrap gap-sm">
      {offset > 0 && (
        <Link href={{ pathname: reviewPath, query: { source: "shared", offset: Math.max(0, offset - paperResultPageSize) } }}
          prefetch={false} className="button-secondary no-underline">{C.previousPage}</Link>
      )}
      {sharedResult?.hasNext && (
        <Link href={{ pathname: reviewPath, query: { source: "shared", offset: offset + paperResultPageSize } }}
          prefetch={false} className="button-secondary no-underline">{C.nextPage}</Link>
      )}
    </div>
  );

  const finishedAt = result?.review?.lifecycle.finishedAt;
  const sessionLinks = result && (
    <div className="space-y-sm">
      <ul className="max-h-64 space-y-xs overflow-y-auto lg:max-h-96">
        {result.sessions.map(({ id, archivedAt }) => (
          <li key={id}>
            <Link href={{ pathname: reviewPath, query: shared ? { session: id, source: "shared", offset } : { session: id, source: "local" } }}
              aria-current={result.selectedId === id ? "page" : undefined} prefetch={false}
              className={cn("block min-h-hit-area-min break-keep rounded-lg border border-transparent px-md py-sm text-body-sm text-text-strong no-underline hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary", result.selectedId === id
                && "border-primary bg-surface-muted font-semibold")}>
              {archivedAt ? <>{!shared && `${C.archived} · `}<time dateTime={archivedAt}>{archiveTime.format(new Date(archivedAt))}</time></> : C.current}
            </Link>
          </li>
        ))}
      </ul>
      {pagination}
    </div>
  );

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-main-max-w flex-col gap-lg font-(family-name:--font-pretendard) sm:gap-xl">
      <header className="flex flex-wrap items-center justify-between gap-sm">
        <div className="space-y-xs">
          <h1 className="text-h1 font-bold text-text-strong">{C.title}</h1>
          {finishedAt && Number.isFinite(Date.parse(finishedAt)) && (
            <p className="text-body-sm text-text-muted">{C.finished} · <time dateTime={finishedAt}>{archiveTime.format(new Date(finishedAt))}</time></p>
          )}
        </div>
        <Link href={local ? "/program-trading" : "/profile"} className="button-secondary program-trading-action whitespace-nowrap no-underline">
          <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
          {local ? C.back : C.backToProfile}
        </Link>
      </header>

      {local && (
        <nav aria-label={C.source} className="grid w-fit max-w-full grid-cols-2 gap-sm">
          <Link href={{ pathname: reviewPath, query: { source: "local" } }} aria-current={!shared ? "page" : undefined}
            prefetch={false} className={cn("button-secondary flex items-center justify-center text-center no-underline", !shared && "border-primary")}>{C.localResults}</Link>
          <Link href={{ pathname: reviewPath, query: { source: "shared" } }} aria-current={shared ? "page" : undefined}
            prefetch={false} className={cn("button-secondary flex items-center justify-center text-center no-underline", shared && "border-primary")}>{C.sharedResults}</Link>
        </nav>
      )}
      {result ? (
        <div className="grid min-w-0 gap-lg lg:grid-cols-[minmax(0,1fr)_14rem]">
          {(result.sessions.length > 1 || (result.sessions.length > 0 && !result.review) || pagination) && (
            <details className="border-y border-border-line lg:hidden">
              <summary className="min-h-hit-area-min cursor-pointer rounded-md py-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary text-body-sm font-semibold text-text-strong">{C.changeSession}</summary>
              <nav aria-label={C.sessions} className="mt-sm">{sessionLinks}</nav>
            </details>
          )}
          <div className="min-w-0 space-y-lg lg:col-start-1 lg:row-start-1">
            {result.review ? (
              <>
                <Suspense fallback={<ProgramTradingEvaluationStatus message={C.evaluationLoading} />}>
                  <ProgramTradingEvaluation startedAt={result.review.lifecycle.startedAt} canApply={local && !shared} />
                </Suspense>
                <ProgramTradingReviewTable review={result.review} />
              </>
            ) : <p className="border-t border-border-line pt-md text-body-sm text-text-muted">
              {sessionId || result.sessions.length ? (shared ? C.sharedUnavailable : C.unavailable) : C.empty}
            </p>}
            <ProgramTradingPerformance points={result.performance} selectedId={result.selectedId} paginated={shared} />
          </div>
          {(result.sessions.length > 0 || pagination) && (
            <nav aria-label={C.sessions} className="hidden h-fit min-w-0 space-y-sm border-l border-border-line pl-md lg:sticky lg:top-lg lg:col-start-2 lg:row-start-1 lg:block">
              <h2 className="text-h2 font-bold text-text-strong">{C.sessions}</h2>
              {sessionLinks}
            </nav>
          )}
        </div>
      ) : <p role="alert" className="text-body-sm text-text-muted">{shared ? C.sharedError : C.error}</p>}
    </div>
  );
}
