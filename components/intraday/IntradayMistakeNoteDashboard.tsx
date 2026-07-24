"use client";

import Link from "next/link";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Database,
  GitMerge,
  RefreshCw,
  ShieldCheck,
  Target,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MISTAKE_NOTE_DASHBOARD_COPY as C } from "@/lib/copy/intraday/mistakeNoteDashboard";
import type { MistakeNoteDashboardData } from "@/lib/types/intraday/mistakeNoteDashboard";
import { cn } from "@/lib/utils/cn";
import { formatPct } from "@/lib/utils/formatPct";

const REFRESH_INTERVAL_MS = 30_000;

const PROCESS_STEPS: Array<{ label: string; description: string; icon: LucideIcon }> = [
  { label: "15:41", description: "세션 완료", icon: Database },
  { label: "품질", description: "owner·라벨 게이트", icon: ShieldCheck },
  { label: "분리", description: "실제·반사실·선정", icon: GitMerge },
  { label: "OOS", description: "전일 규칙 검증", icon: Target },
  { label: "수명", description: "승격·퇴역", icon: RefreshCw },
];

function formatWon(value: number): string {
  return `${new Intl.NumberFormat("ko-KR").format(Math.round(value))}원`;
}

function formatRatio(value: number | null): string {
  return value === null ? "-" : formatPct(value * 100, { digits: 1 });
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function StatCard({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="card flex min-h-28 flex-col justify-between gap-md">
      <span className="text-caption text-text-muted">{label}</span>
      <strong
        className={cn(
          "text-h2 tabular-nums",
          tone === "up" ? "text-signal-up" : tone === "down" ? "text-signal-down" : "text-text-strong",
        )}
      >
        {value}
      </strong>
      <span className="text-caption text-text-muted">{note}</span>
    </div>
  );
}

function EvidenceCard({
  title,
  description,
  value,
  note,
}: {
  title: string;
  description: string;
  value: string;
  note: string;
}) {
  return (
    <article className="flex flex-col gap-sm rounded-lg border border-border-line bg-surface p-lg">
      <h3 className="text-body-md font-bold text-text-strong">{title}</h3>
      <p className="text-body-sm text-text-muted">{description}</p>
      <strong className="mt-auto text-h3 tabular-nums text-text-strong">{value}</strong>
      <span className="text-caption text-text-muted">{note}</span>
    </article>
  );
}

export function IntradayMistakeNoteDashboard({ data }: { data: MistakeNoteDashboardData }) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const latest = data.latest;
  const latestReturn = latest?.actual.portfolioReturnPct ?? null;

  const refresh = () => startRefresh(() => router.refresh());
  useEffect(() => {
    const timer = window.setInterval(() => startRefresh(() => router.refresh()), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [router]);

  return (
    <main className="mx-auto flex w-full max-w-main-max-w flex-col gap-xl">
      <header className="flex flex-col gap-md lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-sm">
          <Link href="/intraday" className="inline-flex w-fit items-center gap-xs text-caption text-text-muted hover:text-text-strong">
            <ArrowLeft className="size-4" aria-hidden />
            {C.back}
          </Link>
          <div className="flex flex-wrap items-center gap-sm">
            <h1 className="text-h1 font-bold text-text-strong">{C.title}</h1>
            <Badge variant="info">{C.localOnly}</Badge>
          </div>
          <p className="text-body-sm text-text-muted">{C.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-sm">
          <span className="inline-flex items-center gap-xs text-caption text-text-muted">
            <Clock3 className="size-4" aria-hidden />
            {C.autoRefresh} · {formatDateTime(data.loadedAt)} 기준
          </span>
          <Button
            variant="secondary"
            size="sm"
            loading={isRefreshing}
            onClick={refresh}
            className="inline-flex shrink-0 items-center justify-center gap-xs whitespace-nowrap"
          >
            <RefreshCw className="size-4" aria-hidden />
            {isRefreshing ? C.refreshing : C.refresh}
          </Button>
        </div>
      </header>

      {!latest ? (
        <div className="card-info flex items-center gap-sm text-body-sm">
          <AlertTriangle className="size-5 shrink-0" aria-hidden />
          {C.noData}
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-md lg:grid-cols-4" aria-label="최근 성과 요약">
            <StatCard label={C.latestDate} value={latest.date} note={`${latest.operator} · ${latest.status}`} />
            <StatCard
              label={C.netReturn}
              value={formatPct(latestReturn, { digits: 3, sign: true })}
              note={`${formatWon(latest.actual.netPnlKrw)} · 비용 ${formatWon(latest.actual.costsKrw)}`}
              tone={latestReturn === null ? undefined : latestReturn > 0 ? "up" : latestReturn < 0 ? "down" : undefined}
            />
            <StatCard
              label={C.actualWinLoss}
              value={`${latest.actual.wins}/${latest.actual.losses}`}
              note={`승률 ${formatRatio(latest.actual.winRate)} · ${latest.actual.closedTrades} round-trip`}
            />
            <StatCard
              label={C.memoryRules}
              value={`${data.memory.ruleCount}/${data.memory.maxRules}`}
              note={`ACTIVE ${data.memory.activeCount} · SHADOW ${data.memory.shadowCount}`}
            />
          </section>

          <div className="flex flex-wrap items-center justify-between gap-sm rounded-lg border border-border-line bg-surface-muted px-lg py-md">
            <span className="inline-flex items-center gap-sm text-body-sm font-bold text-text-strong">
              <Target className="size-5 text-accent-vivid" aria-hidden />
              {C.goalZone}
            </span>
            <span className="text-caption text-text-muted">
              현재 {formatPct(latestReturn, { digits: 3, sign: true })} · 장 마감 {data.policy.runAfterKst} KST 이후 최신화
            </span>
          </div>

          <section className="flex flex-col gap-md" aria-labelledby="evidence-title">
            <div>
              <h2 id="evidence-title" className="text-h2 font-bold text-text-strong">{C.evidenceTitle}</h2>
              <p className="mt-xs text-caption text-text-muted">같은 날의 숫자여도 용도가 다르면 합산하지 않아요.</p>
            </div>
            <div className="grid gap-md lg:grid-cols-3">
              <EvidenceCard
                title={C.actualTitle}
                description={C.actualDescription}
                value={`${latest.actual.wins}/${latest.actual.losses} · ${formatWon(latest.actual.netPnlKrw)}`}
                note={`강제청산 ${latest.actual.forcedExitTrades}/${latest.actual.closedTrades} · 선제청산 ${latest.actual.proactiveExitTrades}`}
              />
              <EvidenceCard
                title={C.counterfactualTitle}
                description={C.counterfactualDescription}
                value={`${latest.counterfactualBuy.wins}/${latest.counterfactualBuy.losses} · ${formatRatio(latest.counterfactualBuy.winRate)}`}
                note={`평균 gross ${formatPct(latest.counterfactualBuy.avgGrossReturnPct, { digits: 3, sign: true })} · 반복 틱은 독립표본 아님`}
              />
              <EvidenceCard
                title={C.selectionTitle}
                description={C.selectionDescription}
                value={`${latest.selection.snapshots} snapshots`}
                note={latest.selection.evaluable ? "선정 lift 평가 가능" : latest.selection.note}
              />
            </div>
          </section>
        </>
      )}

      <section className="card-ai flex flex-col gap-lg" aria-labelledby="rules-title">
        <div className="flex flex-wrap items-start justify-between gap-md">
          <div>
            <h2 id="rules-title" className="text-h2 font-bold text-text-strong">{C.rulesTitle}</h2>
            <p className="mt-xs text-caption text-text-muted">
              런타임에는 관련 범위 최대 {data.memory.runtimeMaxRules}줄/{data.memory.runtimeMaxChars.toLocaleString("ko-KR")}자만 주입
            </p>
          </div>
          <Badge variant={data.memory.sourceSynced ? "info" : "warn"}>
            {data.memory.sourceSynced ? "source와 CM 동기화" : "CM 재생성 필요"}
          </Badge>
        </div>
        {data.memory.rules.length === 0 ? (
          <p className="text-body-sm text-text-muted">{C.rulesEmpty}</p>
        ) : (
          <div className="grid gap-sm">
            {data.memory.rules.map((rule) => (
              <article key={rule.id} className="rounded-lg border border-gradient-ai-soft bg-surface p-md">
                <div className="flex flex-wrap items-center gap-sm">
                  <Badge variant={rule.status === "ACTIVE" ? "accent" : "info"}>{rule.status}</Badge>
                  <span className="text-caption font-bold text-text-strong">{rule.scope}</span>
                  <code className="text-caption text-text-muted">{rule.id}</code>
                  <span className="ml-auto text-caption text-text-muted">~ {rule.until}</span>
                </div>
                <p className="mt-sm text-body-sm text-text-strong"><strong>IF</strong> {rule.condition}</p>
                <p className="mt-xs text-body-sm text-text-strong"><strong>DO</strong> {rule.action}</p>
                <p className="mt-xs text-caption text-text-muted">피하기: {rule.avoid} · {rule.evidence}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-md" aria-labelledby="history-title">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <h2 id="history-title" className="text-h2 font-bold text-text-strong">{C.historyTitle}</h2>
          <span className="text-caption text-text-muted">source {data.sourceCount}개 · 최신순</span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border-line bg-surface">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b border-border-line text-caption text-text-muted">
                <th className="p-md text-left font-normal">날짜 / 운영자</th>
                <th className="p-md text-right font-normal">비용 후 수익</th>
                <th className="p-md text-right font-normal">실제 W/L</th>
                <th className="p-md text-right font-normal">라벨 품질</th>
                <th className="p-md text-right font-normal">후보 규칙</th>
              </tr>
            </thead>
            <tbody>
              {data.days.map((day) => (
                <tr key={`${day.namespace}:${day.date}`} className="border-b border-border-line last:border-0">
                  <td className="p-md text-text-strong"><strong>{day.date}</strong><br /><span className="text-caption text-text-muted">{day.operator} · {day.status}</span></td>
                  <td className={cn("p-md text-right tabular-nums", day.actual.portfolioReturnPct !== null && day.actual.portfolioReturnPct > 0 ? "text-signal-up" : day.actual.portfolioReturnPct !== null && day.actual.portfolioReturnPct < 0 ? "text-signal-down" : "text-text-muted")}>{formatPct(day.actual.portfolioReturnPct, { digits: 3, sign: true })}</td>
                  <td className="p-md text-right tabular-nums text-text-strong">{day.actual.wins}/{day.actual.losses}</td>
                  <td className="p-md text-right tabular-nums text-text-muted">{formatRatio(day.quality.labelCoverageRate)}<br /><span className="text-caption">미확정 {formatRatio(day.quality.unresolvedLabelRate)}</span></td>
                  <td className="p-md text-right tabular-nums text-text-strong">{day.candidateCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-md" aria-labelledby="process-title">
        <h2 id="process-title" className="text-h2 font-bold text-text-strong">{C.processTitle}</h2>
        <div className="grid gap-sm md:grid-cols-3 lg:grid-cols-6">
          {[...PROCESS_STEPS, { label: data.policy.runAfterKst, description: "CM·HTML 재생성", icon: CheckCircle2 }].map(({ label, description, icon: Icon }) => (
            <div key={label} className="flex flex-col gap-sm rounded-lg border border-border-line bg-surface p-md">
              <Icon className="size-5 text-accent-vivid" aria-hidden />
              <strong className="text-body-sm text-text-strong">{label}</strong>
              <span className="text-caption text-text-muted">{description}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className={cn("flex items-start gap-sm rounded-lg p-md text-body-sm", data.validation.ok && data.memory.sourceSynced ? "bg-info-soft text-info" : "bg-warn-soft text-warn")}>
        {data.validation.ok && data.memory.sourceSynced ? <CheckCircle2 className="size-5 shrink-0" aria-hidden /> : <AlertTriangle className="size-5 shrink-0" aria-hidden />}
        <div>
          <strong>{data.validation.ok ? C.validationOk : C.validationError}</strong>
          <p className="mt-xs text-caption">
            CM {data.memory.charCount.toLocaleString("ko-KR")}/{data.memory.maxChars.toLocaleString("ko-KR")}자
            {data.memory.conflicts.length ? ` · 병합 충돌 ${data.memory.conflicts.join(", ")}` : " · 병합 충돌 없음"}
            {!data.memory.sourceSynced ? " · source 병합 후 intraday:notes:merge 필요" : ""}
          </p>
          {data.validation.errors.map((error) => <p key={error} className="mt-xs text-caption">{error}</p>)}
        </div>
      </footer>
    </main>
  );
}
