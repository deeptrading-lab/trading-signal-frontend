import { ArrowLeft } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { AccessDeniedView } from "@/components/layout/AccessDeniedView";
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
  const result = await loadPaperReviews(typeof session === "string" ? session : undefined).catch(() => null);

  return (
    <div className="mx-auto flex min-w-0 w-full max-w-main-max-w flex-col gap-xl font-(family-name:--font-pretendard)">
      <header className="flex flex-wrap items-center justify-between gap-sm">
        <h1 className="text-h1 font-bold text-text-strong">{C.title}</h1>
        <Link href="/program-trading" className="button-secondary program-trading-action whitespace-nowrap no-underline">
          <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
          {C.back}
        </Link>
      </header>

      {result ? (
        <div className="grid min-w-0 gap-lg lg:max-w-4xl lg:grid-cols-[auto_minmax(0,1fr)]">
          <nav aria-label={C.sessions} className="space-y-sm">
            <h2 className="text-body-md font-semibold text-text-strong">{C.sessions}</h2>
            {result.sessions.length ? (
              <ul className="space-y-xs">
                {result.sessions.map(({ id, archivedAt }) => (
                  <li key={id}>
                    <Link href={{ pathname: "/program-trading/review", query: { session: id } }}
                      aria-current={result.selectedId === id ? "page" : undefined} prefetch={false}
                      className={cn("flex min-h-hit-area-min items-center gap-xs rounded-lg border border-transparent px-md py-sm text-body-sm text-text-strong no-underline hover:bg-surface-muted", result.selectedId === id
                        && "border-border-line bg-surface font-semibold")}>
                      {archivedAt ? <>{C.archived} · <time dateTime={archivedAt}>{archiveTime.format(new Date(archivedAt))}</time></> : C.current}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="text-body-sm text-text-muted">{C.empty}</p>}
          </nav>

          {result.review ? (
            <ProgramTradingReviewTable review={result.review} />
          ) : result.sessions.length > 0 && <p className="text-body-sm text-text-muted">{C.unavailable}</p>}
        </div>
      ) : <p role="alert" className="text-body-sm text-text-muted">{C.error}</p>}
    </div>
  );
}
