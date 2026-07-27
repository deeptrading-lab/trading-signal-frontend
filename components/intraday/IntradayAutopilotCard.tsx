"use client";

import { useMemo, useState } from "react";
import {
  BellRing,
  Check,
  ChevronRight,
  Clock3,
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
    childSessionById,
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

  const onStart = async () => {
    if (!capitalValid) {
      setError(C.minimumCapital);
      return;
    }
    setError(null);
    try {
      await start({ purpose: "guide", totalCapital: capital, slotCount: 3, tickIntervalMinutes: 5 });
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

          <div className="grid gap-sm sm:grid-cols-[minmax(0,1fr)_auto]">
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
            <Button
              loading={isStarting}
              disabled={researchRunActive}
              onClick={onStart}
              className="h-12 whitespace-nowrap px-xl"
            >
              {isStarting ? C.starting : researchRunActive ? C.researchRunning : C.start}
            </Button>
          </div>
          <p id="guide-capital-hint" className="text-caption text-text-muted">{C.capitalHint}</p>
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

          <div className="grid grid-cols-3 gap-sm rounded-lg bg-surface-muted p-md">
            <Metric label={C.nextAnalysis} value={active ? nextAnalysisTime(run.lastSweepWindowStart) : "—"} />
            <Metric label={C.watchedStocks} value={`${childSessionById.size}개`} />
            <Metric label={C.holdings} value={`${guideHoldings.length}개`} />
          </div>
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
          <div className="rounded-xl border border-border-line bg-surface-base p-xl text-center">
            <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent-vivid">
              <BellRing className="size-5" aria-hidden />
            </span>
            <h3 className="mt-md text-body-lg font-bold text-text-strong">{C.waitingTitle}</h3>
            <p className="mt-xs text-body-sm text-text-muted">
              {guideLoading ? C.waitingTitle : C.waitingBody}
            </p>
          </div>
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
                  <Badge variant={item.status === "performed" ? "accent" : "info"} className="ml-auto">
                    {item.status === "performed" ? C.performed : C.passed}
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
          <time className="text-caption tabular-nums text-text-muted">{kstTime(item.at)}</time>
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
            label={item.side === "BUY" ? C.stopLossLabel : C.targetLabel}
            value={
              item.side === "BUY"
                ? item.invalidationPrice
                  ? `${formatMoney(item.invalidationPrice)}원`
                  : "상황별 안내"
                : item.targetPrice
                  ? `${formatMoney(item.targetPrice)}원`
                  : "전량 정리"
            }
          />
        </dl>
        <p className="rounded-lg bg-surface-muted px-md py-sm text-body-sm text-text-muted">{item.rationale}</p>

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

function GuideValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-caption text-text-muted">{label}</dt>
      <dd className="mt-xs text-body-md font-bold tabular-nums text-text-strong">{value}</dd>
    </div>
  );
}
