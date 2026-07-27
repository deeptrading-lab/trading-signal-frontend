"use client";

import { useState } from "react";
import { Database, Play, Square } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useIntradayAutopilot } from "@/hooks/intraday/useIntradayAutopilot";
import { isApiError } from "@/lib/api/errors";
import { INTRADAY_RESEARCH_AUTOPILOT_COPY as C } from "@/lib/copy/intraday/researchAutopilot";

export function IntradayResearchAutopilotCard() {
  const { run, isStarting, isStopping, start, stop } = useIntradayAutopilot();
  const [error, setError] = useState<string | null>(null);
  const [confirmingStop, setConfirmingStop] = useState(false);
  const active = run?.status === "active";
  const purpose = run?.purpose ?? "research";
  const researchActive = active && purpose === "research";
  const guideActive = active && purpose === "guide";

  const onStart = async () => {
    setError(null);
    try {
      await start({
        purpose: "research",
        totalCapital: 10_000_000,
        slotCount: 3,
        tickIntervalMinutes: 5,
      });
    } catch (cause) {
      setError(isApiError(cause) ? cause.message : C.error);
    }
  };

  const onStop = async () => {
    if (!run) return;
    setError(null);
    try {
      await stop(run.id, { completeChildSessions: true });
      setConfirmingStop(false);
    } catch (cause) {
      setError(isApiError(cause) ? cause.message : C.stopError);
    }
  };

  return (
    <section className="rounded-lg bg-surface-muted p-md" aria-labelledby="research-autopilot-title">
      <div className="flex flex-col gap-md sm:flex-row sm:items-center">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-vivid">
          <Database className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-sm">
            <h2 id="research-autopilot-title" className="text-body-md font-bold text-text-strong">
              {C.title}
            </h2>
            <Badge variant={researchActive || guideActive ? "accent" : "info"}>
              {researchActive ? C.running : C.badge}
            </Badge>
          </div>
          <p className="mt-xs text-body-sm text-text-muted">
            {researchActive ? C.runningBody : guideActive ? C.guideRunning : C.description}
          </p>
          <p className="mt-xs text-caption text-text-muted">{C.capital}</p>
        </div>
        {!active ? (
          <Button
            size="sm"
            loading={isStarting}
            onClick={onStart}
            className="inline-flex w-full shrink-0 items-center justify-center gap-xs whitespace-nowrap sm:w-auto"
          >
            <Play className="size-3" aria-hidden />
            {isStarting ? C.starting : C.start}
          </Button>
        ) : researchActive ? (
          <Button
            variant="secondary"
            size="sm"
            loading={isStopping}
            onClick={() => setConfirmingStop(true)}
            className="inline-flex w-full shrink-0 items-center justify-center gap-xs whitespace-nowrap text-critical hover:bg-critical-soft sm:w-auto"
          >
            <Square className="size-3" aria-hidden />
            {isStopping ? C.stopping : C.stop}
          </Button>
        ) : null}
      </div>
      {researchActive && confirmingStop ? (
        <div className="mt-md rounded-lg border border-warn-soft bg-warn-soft p-md">
          <p className="text-body-sm font-bold text-warn">{C.stopConfirmTitle}</p>
          <p className="mt-xs text-caption text-warn">{C.stopConfirmBody}</p>
          <div className="mt-md flex flex-col-reverse gap-sm sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              size="sm"
              disabled={isStopping}
              onClick={() => setConfirmingStop(false)}
              className="inline-flex items-center justify-center whitespace-nowrap"
            >
              {C.stopCancel}
            </Button>
            <Button
              size="sm"
              loading={isStopping}
              onClick={onStop}
              className="inline-flex items-center justify-center whitespace-nowrap"
            >
              {isStopping ? C.stopping : C.stopConfirmAction}
            </Button>
          </div>
        </div>
      ) : null}
      {error ? <p role="alert" className="mt-sm text-caption text-signal-down">{error}</p> : null}
      <p className="mt-sm text-caption text-text-muted">{C.note}</p>
    </section>
  );
}
