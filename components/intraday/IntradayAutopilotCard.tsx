/**
 * IntradayAutopilotCard — 단타 오토파일럿(자동 포트폴리오) 시작/중지·슬롯 현황·교체 기록.
 * intraday-autopilot.
 *
 * 출근 전 "자동 시작"만 눌러두면 서버 스케줄러가 09:05부터 종목을 골라 슬롯을 채우고 10분마다
 * 재평가·교체한다. 이 카드는 그 상태를 보여주고 시작/중지만 담당 — 판단·체결·슬롯 로테이션은
 * 전부 서버(runStore 스윕) 소관이다. 자식 세션은 아래 워치 표에 일반 세션으로 함께 나타난다.
 *
 * 노출: 로컬 dev 전용(스케줄러·CLI 가 로컬 상주 전제 — Vercel 은 스윕이 돌지 않아 숨김).
 * 카드리스(헤어라인 구분) 토스톤, 신규 토큰 없음.
 */

"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { useIntradayAutopilot } from "@/hooks/intraday/useIntradayAutopilot";
import { INTRADAY_AUTOPILOT_COPY as A } from "@/lib/copy/stock/intradayRead";
import { cn } from "@/lib/utils/cn";
import { formatMoney } from "@/lib/utils/formatMoney";
import { formatPct } from "@/lib/utils/formatPct";
import { isVercelRuntime } from "@/lib/utils/runtimeEnv";
import type {
  AutopilotRotationEvent,
  AutopilotRun,
  AutopilotSlot,
} from "@/lib/types/paperTrading/autopilot";
import type { PaperTradingSession } from "@/lib/types/paperTrading/paperTrading";

const DEFAULT_CAPITAL = 10_000_000;
const DEFAULT_SLOTS = 3;
/** 첫 fill 시각(서버 AUTOPILOT_FIRST_FILL_HHMM 기본과 정합) — 상태 문구 분기용 표시 전용. */
const FIRST_FILL_HHMM = "09:05";

function kstHhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Seoul",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLine(run: AutopilotRun): string {
  if (run.status === "stopped") return A.statusStopped;
  if (run.status === "completed") return A.statusCompleted;
  const nowHhmm = kstHhmm(new Date().toISOString());
  return nowHhmm < FIRST_FILL_HHMM ? A.statusWaitingOpen : A.statusActive;
}

function eventText(event: AutopilotRotationEvent): string {
  const parts: string[] = [];
  if (event.outgoing) parts.push(`${event.outgoing.ticker} ← ${event.outgoing.reason}`);
  if (event.incoming) parts.push(`${event.incoming.ticker} 편입(점수 ${event.incoming.score})`);
  if (event.note) parts.push(event.note);
  return parts.join(" · ");
}

function SlotChip({
  slot,
  session,
}: {
  slot: AutopilotSlot;
  session: PaperTradingSession | undefined;
}) {
  if (!slot.sessionId || !slot.ticker) {
    return (
      <span className="inline-flex items-center rounded-pill border border-dashed border-border-line px-md py-xs text-caption text-text-muted">
        {A.slotEmpty}
      </span>
    );
  }
  const name = session?.stocks[0]?.name ?? slot.ticker;
  const returnPct = session?.returnPct;
  return (
    <span className="inline-flex items-center gap-xs rounded-pill border border-border-line px-md py-xs text-caption">
      <span className="font-bold text-text-strong">{name}</span>
      {returnPct !== undefined ? (
        <span
          className={cn(
            returnPct > 0 ? "text-signal-up" : returnPct < 0 ? "text-signal-down" : "text-text-muted",
          )}
        >
          {formatPct(returnPct, { sign: true })}
        </span>
      ) : null}
      {session && session.status !== "running" ? (
        <span className="text-text-muted">{A.slotDone}</span>
      ) : null}
    </span>
  );
}

export function IntradayAutopilotCard() {
  const { run, kisReady, childSessionById, runPnl, isStarting, isStopping, start, stop } =
    useIntradayAutopilot();
  const [capitalInput, setCapitalInput] = useState(String(DEFAULT_CAPITAL));
  const [slotCount, setSlotCount] = useState(DEFAULT_SLOTS);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 로테이션 로그는 최신순 상위 20건만 — 상세 전수는 Supabase payload 로 남는다.
  const recentEvents = useMemo(
    () => (run ? [...run.rotationLog].reverse().slice(0, 20) : []),
    [run],
  );

  if (isVercelRuntime()) return null;

  const capital = Number.parseInt(capitalInput.replaceAll(",", ""), 10);
  const capitalValid = Number.isFinite(capital) && capital >= 1_000_000;

  const onStart = async () => {
    if (!capitalValid) {
      setError(A.capitalInvalid);
      return;
    }
    setError(null);
    try {
      await start({ totalCapital: capital, slotCount });
    } catch {
      setError(A.error);
    }
  };

  const onStop = async () => {
    if (!run) return;
    setError(null);
    try {
      await stop(run.id);
    } catch {
      setError(A.error);
    }
  };

  return (
    <section className="flex flex-col gap-sm" aria-label={A.title}>
      <div className="flex flex-wrap items-center gap-sm">
        <h2 className="text-body-md font-bold text-text-strong">{A.title}</h2>
        <Badge variant="accent">{A.badge}</Badge>
        {!kisReady ? (
          <Badge variant="warn" title={A.kisNotReady}>
            {A.kisNotReady}
          </Badge>
        ) : null}
      </div>

      {!run || run.status !== "active" ? (
        <>
          <p className="text-caption text-text-muted">{A.subtitle}</p>
          <div className="flex flex-wrap items-end gap-md">
            <label className="flex flex-col gap-xs text-caption text-text-muted">
              {A.totalCapitalLabel}
              <input
                type="text"
                inputMode="numeric"
                value={capitalInput}
                onChange={(e) => setCapitalInput(e.target.value)}
                className="w-[10rem] rounded-md border border-border-line px-sm py-xs text-body-sm text-text-strong"
              />
            </label>
            <label className="flex flex-col gap-xs text-caption text-text-muted">
              {A.slotCountLabel}
              <select
                value={slotCount}
                onChange={(e) => setSlotCount(Number(e.target.value))}
                className="rounded-md border border-border-line px-sm py-xs text-body-sm text-text-strong"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {A.slotCountUnit(n)}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="primary" size="sm" loading={isStarting} onClick={onStart}>
              {isStarting ? A.starting : A.startLabel}
            </Button>
          </div>
          {run && run.status !== "active" ? (
            <p className="text-caption text-text-muted">{statusLine(run)}</p>
          ) : null}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-md">
            <span className="text-caption text-accent-vivid">{statusLine(run)}</span>
            <span className="text-caption text-text-muted">
              {formatMoney(run.totalCapital)} · {A.slotCountUnit(run.slotCount)}
            </span>
            {runPnl.childCount > 0 ? (
              <span className="text-caption">
                {A.pnlLabel}{" "}
                <span
                  className={cn(
                    "font-bold",
                    runPnl.pnlKrw > 0
                      ? "text-signal-up"
                      : runPnl.pnlKrw < 0
                        ? "text-signal-down"
                        : "text-text-muted",
                  )}
                >
                  {formatPct(runPnl.pnlPct, { sign: true })}
                </span>{" "}
                <span className="text-text-muted">({A.pnlChildren(runPnl.childCount)})</span>
              </span>
            ) : null}
            <Button
              variant="secondary"
              size="sm"
              loading={isStopping}
              onClick={onStop}
              className="ml-auto"
              title={A.stopHint}
            >
              {isStopping ? A.stopping : A.stopLabel}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-sm">
            {run.slots.map((slot) => (
              <SlotChip
                key={slot.slotIndex}
                slot={slot}
                session={slot.sessionId ? childSessionById.get(slot.sessionId) : undefined}
              />
            ))}
            {run.lastScreenerSummary && !run.lastScreenerSummary.unavailableReason ? (
              <span className="text-caption text-text-muted">
                {A.screenerLabel(
                  run.lastScreenerSummary.universeSize,
                  run.lastScreenerSummary.passed,
                )}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            aria-expanded={historyOpen}
            className="self-start text-caption text-text-muted underline-offset-2 hover:underline cursor-pointer"
          >
            {A.historyTitle} {historyOpen ? "▴" : "▾"}
          </button>
          {historyOpen ? (
            recentEvents.length === 0 ? (
              <p className="text-caption text-text-muted">{A.historyEmpty}</p>
            ) : (
              <ul className="flex flex-col gap-xs">
                {recentEvents.map((event, i) => (
                  <li key={`${event.at}-${i}`} className="flex items-baseline gap-sm text-caption">
                    <span className="tabular-nums text-text-muted">{kstHhmm(event.at)}</span>
                    <span className="shrink-0 font-bold text-text-strong">
                      {A.historyKind[event.kind]}
                    </span>
                    <span className="text-text-muted">{eventText(event)}</span>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </>
      )}

      {error ? <p className="text-caption text-signal-down">{error}</p> : null}
      <Divider />
    </section>
  );
}
