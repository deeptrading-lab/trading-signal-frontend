"use client";

import { useMemo, useState } from "react";
import {
  BellRing,
  Check,
  ChevronRight,
  Clock3,
  Gauge,
  ShieldCheck,
  Sparkles,
  Square,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { useIntradayAutopilot } from "@/hooks/intraday/useIntradayAutopilot";
import { isApiError } from "@/lib/api/errors";
import { INTRADAY_GUIDE_COPY as C } from "@/lib/copy/intraday/guideProduct";
import type { IntradayGuideItem } from "@/lib/intraday/guideFeed";
import type { AutopilotRun } from "@/lib/types/paperTrading/autopilot";
import {
  buildIntradayGuideScenario,
  resolveIntradayGuideWaitReason,
} from "@/lib/intraday/guideProduct";
import { cn } from "@/lib/utils/cn";
import { formatKrwInput, formatMoney } from "@/lib/utils/formatMoney";

const DEFAULT_CAPITAL = 10_000_000;
const GUIDE_ACTION_BUTTON_CLASS =
  "inline-flex h-button-primary-h w-full shrink-0 items-center justify-center gap-xs whitespace-nowrap sm:w-auto";

function kstTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function nextAnalysisTime(lastSweepWindowStart: string | null): string {
  if (!lastSweepWindowStart) return "곧 시작";
  return kstTime(new Date(new Date(lastSweepWindowStart).getTime() + 10 * 60_000).toISOString());
}

function directionLabel(item: IntradayGuideItem): string {
  return item.side === "BUY" ? C.buy : C.sell;
}

export function IntradayAutopilotCard() {
  const {
    run,
    guidePolicy,
    kisReady,
    isStarting,
    isStopping,
    isResponding,
    respondingGuideId,
    guideItems,
    guideHoldings,
    guideLoading,
    start,
    stop,
    respond,
  } = useIntradayAutopilot();
  const [capitalInput, setCapitalInput] = useState(formatKrwInput(String(DEFAULT_CAPITAL)));
  const [confirmingGuideId, setConfirmingGuideId] = useState<string | null>(null);
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pending = useMemo(
    () => guideItems.filter((item) => item.status === "pending"),
    [guideItems],
  );
  const activity = useMemo(
    () => guideItems.filter((item) => item.status !== "pending").slice(0, 8),
    [guideItems],
  );
  const currentGuide = pending[0] ?? null;
  const researchRunActive = run?.status === "active" && (run.purpose ?? "research") === "research";
  const capital = Number(capitalInput.replace(/[^0-9]/g, ""));
  const capitalValid = Number.isFinite(capital) && capital >= 1_000_000;
  const scenario = buildIntradayGuideScenario(capital, guidePolicy);
  const activeSlotCount = run?.slots.filter((slot) => slot.sessionId).length ?? 0;
  const emptySlotCount = Math.max(0, (run?.slotCount ?? 0) - activeSlotCount);

  const onStart = async () => {
    if (!capitalValid) {
      setError(C.minimumCapital);
      return;
    }
    setError(null);
    try {
      await start({
        purpose: "guide",
        riskAcknowledgedAt: new Date().toISOString(),
        totalCapital: capital,
        slotCount: 3,
        tickIntervalMinutes: 5,
      });
    } catch (cause) {
      setError(isApiError(cause) ? cause.message : C.startError);
    }
  };

  const onStop = async () => {
    if (!run) return;
    setError(null);
    try {
      await stop(run.id);
    } catch (cause) {
      setError(isApiError(cause) ? cause.message : C.stopError);
    }
  };

  const onRespond = async (item: IntradayGuideItem, response: "performed" | "passed") => {
    if (!run) return;
    setError(null);
    try {
      await respond(run.id, item.id, response);
      setConfirmingGuideId(null);
    } catch (cause) {
      setError(isApiError(cause) ? cause.message : C.responseError);
    }
  };

  if (!run || (run.purpose ?? "research") !== "guide") {
    return (
      <section
        className="overflow-hidden rounded-xl border border-border-line bg-surface-base shadow-card"
        aria-labelledby="intraday-guide-title"
      >
        <div className="flex flex-col gap-lg p-lg md:p-xl">
          <div className="flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-md">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-vivid">
                <Sparkles className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-caption font-bold text-accent-vivid">{C.eyebrow}</p>
                <h2 id="intraday-guide-title" className="mt-xs text-h2 font-bold text-text-strong">
                  {C.title}
                </h2>
                <p className="mt-xs text-body-sm text-text-muted">{C.subtitle}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-sm sm:block sm:text-right">
              <p className="text-h2 font-bold tabular-nums text-text-strong">{C.price}</p>
              <Badge variant="info" className="sm:mt-xs">{C.trial}</Badge>
            </div>
          </div>

          <ul className="grid gap-sm text-body-sm text-text-muted sm:grid-cols-3">
            {C.benefits.map((benefit, index) => (
              <li key={benefit} className="flex items-center gap-xs">
                {index === 0 ? <Clock3 className="size-4 text-accent-vivid" aria-hidden /> : null}
                {index === 1 ? <BellRing className="size-4 text-accent-vivid" aria-hidden /> : null}
                {index === 2 ? <ShieldCheck className="size-4 text-accent-vivid" aria-hidden /> : null}
                {benefit}
              </li>
            ))}
          </ul>

          <section className="rounded-lg bg-surface-muted p-md" aria-labelledby="guide-strategy-title">
            <div className="flex items-center gap-xs">
              <Gauge className="size-4 text-accent-vivid" aria-hidden />
              <h3 id="guide-strategy-title" className="text-body-sm font-bold text-text-strong">
                {C.strategyTitle}
              </h3>
            </div>
            <dl className="mt-md grid grid-cols-2 gap-md sm:grid-cols-4">
              <Metric label={C.strategyItems.target} value={`+${guidePolicy.takeProfitPct}%`} />
              <Metric label={C.strategyItems.stop} value={`${guidePolicy.stopLossPct}%`} />
              <Metric label={C.strategyItems.allocation} value={`${guidePolicy.maxPositionPct}%`} />
              <Metric label={C.strategyItems.stocks} value="3종목" />
            </dl>
          </section>

          <div className="grid gap-sm">
            <label className="flex min-w-0 items-center rounded-lg border border-border-line bg-surface-base px-md focus-within:border-accent-vivid">
              <span className="shrink-0 text-body-sm font-medium text-text-muted">{C.capitalLabel}</span>
              <input
                value={capitalInput}
                onChange={(event) => setCapitalInput(formatKrwInput(event.target.value))}
                inputMode="numeric"
                aria-describedby="guide-capital-hint"
                className="h-12 min-w-0 flex-1 bg-transparent text-right text-body-lg font-bold tabular-nums text-text-strong outline-none"
              />
              <span className="ml-xs text-body-sm text-text-muted">원</span>
            </label>
          </div>
          <p id="guide-capital-hint" className="text-caption text-text-muted">{C.capitalHint}</p>

          <section className="rounded-lg border border-border-line p-md" aria-labelledby="guide-scenario-title">
            <h3 id="guide-scenario-title" className="text-body-sm font-bold text-text-strong">
              {C.scenarioTitle}
            </h3>
            <dl className="mt-sm grid grid-cols-2 gap-md">
              <Metric label={C.scenarioTarget} value={`+${formatMoney(scenario.targetProfit)}원`} />
              <Metric label={C.scenarioLoss} value={`-${formatMoney(scenario.plannedLoss)}원`} />
            </dl>
            <p className="mt-sm text-caption text-text-muted">{C.scenarioNotice}</p>
          </section>

          <label className="flex cursor-pointer items-start gap-sm rounded-lg border border-border-line p-md">
            <input
              type="checkbox"
              checked={riskAcknowledged}
              onChange={(event) => setRiskAcknowledged(event.target.checked)}
              className="mt-2xs size-4 accent-accent-vivid"
            />
            <span>
              <span className="block text-body-sm font-medium text-text-strong">{C.riskAcknowledgement}</span>
              <span className="mt-2xs block text-caption text-text-muted">{C.riskAcknowledgementHint}</span>
            </span>
          </label>
          <Button
            loading={isStarting}
            disabled={researchRunActive || !riskAcknowledged}
            onClick={onStart}
            className="h-12 w-full whitespace-nowrap px-xl"
          >
            {isStarting ? C.starting : researchRunActive ? C.researchRunning : C.start}
          </Button>
          {researchRunActive ? (
            <p className="text-caption text-accent-vivid">{C.researchRunningHint}</p>
          ) : null}
          {error ? <p role="alert" className="text-body-sm text-signal-down">{error}</p> : null}
          <p className="text-caption text-text-muted">{C.disclaimer}</p>
        </div>
      </section>
    );
  }

  const active = run.status === "active";
  return (
    <section className="flex flex-col gap-md" aria-label={C.title}>
      <div className="overflow-hidden rounded-xl border border-border-line bg-surface-base shadow-card">
        <div className="flex flex-col gap-md p-lg md:p-xl">
          <div className="flex flex-wrap items-center gap-sm">
            <span className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent-vivid">
              <Sparkles className="size-4" aria-hidden />
            </span>
            <div>
              <h2 className="text-body-lg font-bold text-text-strong">{C.title}</h2>
              <p className="text-caption text-text-muted">{active ? C.running : C.stopped}</p>
            </div>
            <Badge variant={active ? "accent" : "info"} className="ml-sm">
              {active ? C.running : C.stopped}
            </Badge>
            {active ? (
              <Button
                variant="secondary"
                size="sm"
                loading={isStopping}
                onClick={onStop}
                className="mt-xs inline-flex w-full items-center justify-center gap-xs whitespace-nowrap text-critical hover:bg-critical-soft sm:mt-0 sm:ml-auto sm:w-auto"
              >
                <Square className="size-3" aria-hidden />
                {isStopping ? C.stopping : C.stop}
              </Button>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-sm rounded-lg bg-surface-muted p-md sm:grid-cols-4">
            <Metric label={C.nextAnalysis} value={active ? nextAnalysisTime(run.lastSweepWindowStart) : "—"} />
            <Metric label={C.watchedStocks} value={`${activeSlotCount}개`} />
            <Metric label={C.emptySlots} value={`${emptySlotCount}개`} />
            <Metric label={C.recentCandidates} value={`${run.lastScreenerSummary?.passed ?? 0}개`} />
          </div>
          <p className="text-caption text-text-muted">{C.selectiveEntry}</p>
          <p className="flex items-center gap-xs text-caption text-text-muted">
            <ShieldCheck className="size-4" aria-hidden />
            {C.originalNotice}
          </p>
        </div>
      </div>

      {active ? (
        currentGuide ? (
          <GuideActionCard
            item={currentGuide}
            pendingCount={pending.length}
            confirming={confirmingGuideId === currentGuide.id}
            isResponding={isResponding && respondingGuideId === currentGuide.id}
            onConfirm={() => setConfirmingGuideId(currentGuide.id)}
            onCancelConfirm={() => setConfirmingGuideId(null)}
            onRespond={(response) => onRespond(currentGuide, response)}
          />
        ) : (
          <GuideWaitingCard run={run} kisReady={kisReady} loading={guideLoading} />
        )
      ) : (
        <div className="rounded-lg bg-surface-muted p-md text-body-sm text-text-muted">{C.completedBody}</div>
      )}

      {error ? <p role="alert" className="text-body-sm text-signal-down">{error}</p> : null}

      <div className="grid gap-md lg:grid-cols-2">
        <section className="rounded-xl border border-border-line bg-surface-base p-lg" aria-labelledby="guide-holdings-title">
          <div className="flex items-center gap-sm">
            <WalletCards className="size-5 text-accent-vivid" aria-hidden />
            <h3 id="guide-holdings-title" className="text-body-md font-bold text-text-strong">{C.holdingTitle}</h3>
          </div>
          {guideHoldings.length === 0 ? (
            <p className="mt-md text-body-sm text-text-muted">{C.holdingEmpty}</p>
          ) : (
            <ul className="mt-md divide-y divide-border-line">
              {guideHoldings.map((holding) => (
                <li key={holding.ticker} className="flex items-center justify-between gap-md py-sm text-body-sm">
                  <div>
                    <p className="font-bold text-text-strong">{holding.name}</p>
                    <p className="text-caption text-text-muted">{holding.ticker}</p>
                  </div>
                  <p className="text-right tabular-nums text-text-strong">
                    <span className="font-bold">{holding.quantity}주</span>
                    <span className="ml-sm text-caption text-text-muted">
                      {C.averagePrice} {formatMoney(holding.averagePrice)}원
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border-line bg-surface-base p-lg" aria-labelledby="guide-activity-title">
          <h3 id="guide-activity-title" className="text-body-md font-bold text-text-strong">{C.activityTitle}</h3>
          {activity.length === 0 ? (
            <p className="mt-md text-body-sm text-text-muted">{C.activityEmpty}</p>
          ) : (
            <ul className="mt-md divide-y divide-border-line">
              {activity.map((item) => (
                <li key={item.id} className="flex items-center gap-sm py-sm text-body-sm">
                  <span className={cn("size-2 rounded-full", item.side === "BUY" ? "bg-signal-up" : "bg-signal-down")} />
                  <span className="font-bold text-text-strong">{item.name}</span>
                  <span className="text-text-muted">{directionLabel(item)}</span>
                  <Badge
                    variant={item.status === "performed" ? "accent" : item.status === "expired" ? "warn" : "info"}
                    className="ml-auto"
                  >
                    {item.status === "performed" ? C.performed : item.status === "expired" ? C.expired : C.passed}
                  </Badge>
                  <time className="text-caption tabular-nums text-text-muted">{kstTime(item.at)}</time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <Divider />
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-caption text-text-muted">{label}</p>
      <p className="mt-xs truncate text-body-md font-bold tabular-nums text-text-strong">{value}</p>
    </div>
  );
}

function GuideActionCard({
  item,
  pendingCount,
  confirming,
  isResponding,
  onConfirm,
  onCancelConfirm,
  onRespond,
}: {
  item: IntradayGuideItem;
  pendingCount: number;
  confirming: boolean;
  isResponding: boolean;
  onConfirm: () => void;
  onCancelConfirm: () => void;
  onRespond: (response: "performed" | "passed") => void;
}) {
  const targetProfit = item.targetPrice
    ? Math.max(0, (item.targetPrice - item.price) * item.quantity)
    : null;
  const plannedLoss = item.invalidationPrice
    ? Math.max(0, (item.price - item.invalidationPrice) * item.quantity)
    : null;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border bg-surface-base shadow-card",
        item.side === "BUY" ? "border-signal-up" : "border-signal-down",
      )}
      aria-labelledby={`guide-${item.id}`}
    >
      <div className={cn("h-1", item.side === "BUY" ? "bg-signal-up" : "bg-signal-down")} />
      <div className="flex flex-col gap-lg p-lg md:p-xl">
        <div className="flex flex-wrap items-center gap-sm">
          <Badge variant={item.side === "BUY" ? "signal-up" : "signal-down"}>{directionLabel(item)}</Badge>
          <span className="text-caption font-bold text-accent-vivid">{C.guideEyebrow}</span>
          {pendingCount > 1 ? <Badge variant="info" className="ml-auto">{C.waitingCount(pendingCount)}</Badge> : null}
          <Badge variant="info" className={pendingCount > 1 ? undefined : "ml-auto"}>
            {C.validUntil(kstTime(item.validUntil))}
          </Badge>
        </div>

        <div>
          <p className="text-caption text-text-muted">{item.ticker}</p>
          <h3 id={`guide-${item.id}`} className="mt-xs text-h1 font-bold text-text-strong">{item.name}</h3>
        </div>

        <dl className="grid grid-cols-2 gap-md sm:grid-cols-4">
          <GuideValue label={C.priceLabel} value={`${formatMoney(item.price)}원`} />
          <GuideValue label={C.quantityLabel} value={`${item.quantity}주`} />
          <GuideValue label={C.amountLabel} value={`${formatMoney(item.notional)}원`} />
          <GuideValue
            label={C.convictionLabel}
            value={item.convictionScore == null ? "—" : `${item.convictionScore}점`}
          />
        </dl>

        {item.side === "BUY" ? (
          <section className="grid gap-sm rounded-lg border border-border-line p-md sm:grid-cols-2" aria-label="목표와 손절 계획">
            <div>
              <GuideValue
                label={C.targetLabel}
                value={item.targetPrice ? `${formatMoney(item.targetPrice)}원` : "상황별 안내"}
              />
              <p className="mt-xs text-caption tabular-nums text-signal-up">
                {C.expectedProfit} {targetProfit == null ? "—" : `+${formatMoney(targetProfit)}원`}
              </p>
            </div>
            <div>
              <GuideValue
                label={C.stopLossLabel}
                value={item.invalidationPrice ? `${formatMoney(item.invalidationPrice)}원` : "상황별 안내"}
              />
              <p className="mt-xs text-caption tabular-nums text-signal-down">
                {C.plannedLoss} {plannedLoss == null ? "—" : `-${formatMoney(plannedLoss)}원`}
              </p>
            </div>
          </section>
        ) : null}
        <p className="rounded-lg bg-surface-muted px-md py-sm text-body-sm text-text-muted">{item.rationale}</p>
        {item.riskNotes.length > 0 ? (
          <section aria-labelledby={`guide-risk-${item.id}`}>
            <h4 id={`guide-risk-${item.id}`} className="text-caption font-bold text-text-strong">
              {C.riskTitle}
            </h4>
            <ul className="mt-xs space-y-xs text-caption text-text-muted">
              {item.riskNotes.map((note, index) => <li key={`${index}-${note}`}>• {note}</li>)}
            </ul>
          </section>
        ) : null}
        <p className="text-caption text-text-muted">{C.validityNotice}</p>

        {confirming ? (
          <div className="rounded-lg border border-accent-vivid bg-accent-soft p-md" role="group" aria-label={C.confirmTitle(item.side)}>
            <p className="font-bold text-text-strong">{C.confirmTitle(item.side)}</p>
            <p className="mt-xs text-caption text-text-muted">{C.confirmBody}</p>
            <div className="mt-md flex flex-col-reverse gap-sm sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                onClick={onCancelConfirm}
                disabled={isResponding}
                className={GUIDE_ACTION_BUTTON_CLASS}
              >
                {C.cancel}
              </Button>
              <Button
                loading={isResponding}
                onClick={() => onRespond("performed")}
                className={GUIDE_ACTION_BUTTON_CLASS}
              >
                <Check className="size-4 shrink-0" aria-hidden />
                {isResponding ? C.responding : C.confirm}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col-reverse gap-sm sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => onRespond("passed")}
              disabled={isResponding}
              className={GUIDE_ACTION_BUTTON_CLASS}
            >
              {C.pass}
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isResponding}
              className={GUIDE_ACTION_BUTTON_CLASS}
            >
              {item.side === "BUY" ? C.buyAction : C.sellAction}
              <ChevronRight className="size-4 shrink-0" aria-hidden />
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

function GuideWaitingCard({
  run,
  kisReady,
  loading,
}: {
  run: AutopilotRun;
  kisReady: boolean;
  loading: boolean;
}) {
  const reason = resolveIntradayGuideWaitReason(run, kisReady);
  const body = reason === "market-data"
    ? C.waitReasons.marketData
    : reason === "cooldown"
      ? C.waitReasons.cooldown
      : reason === "no-candidate"
        ? C.waitReasons.noCandidate
        : reason === "quality-gate"
          ? C.waitReasons.qualityGate
          : C.waitReasons.screening;
  const summary = run.lastScreenerSummary;

  return (
    <div className="rounded-xl border border-border-line bg-surface-base p-xl text-center" role="status">
      <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent-vivid">
        <BellRing className="size-5" aria-hidden />
      </span>
      <h3 className="mt-md text-body-lg font-bold text-text-strong">{C.waitingTitle}</h3>
      <p className="mx-auto mt-xs w-full max-w-[44rem] break-keep text-body-sm leading-relaxed text-text-muted">
        {loading ? C.waitingBody : body}
      </p>
      {summary ? (
        <p className="mt-sm text-caption tabular-nums text-text-muted">
          {C.waitSummary(summary.universeSize, summary.passed)} · {kstTime(summary.at)} 기준
        </p>
      ) : null}
      <p className="mt-md text-caption font-medium text-accent-vivid">{C.selectiveEntry}</p>
    </div>
  );
}

function GuideValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-caption text-text-muted">{label}</dt>
      <dd className="mt-xs text-body-md font-bold tabular-nums text-text-strong">{value}</dd>
    </div>
  );
}
