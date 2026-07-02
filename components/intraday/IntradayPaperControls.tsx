/**
 * IntradayPaperControls — 워치 카드 하단 "AI 모의 단타" 시작/현황. intraday-paper-watch.
 *
 * 세션 없음 → 모의 투자금 입력 + 시작(cli-agent 세션 생성). 자동 틱은 워크스페이스의
 * useIntradayPaperAutoTick 이 담당(화면이 열려 있는 동안 장중 5분 창 단위).
 * 세션 있음 → 수익률·포지션·최근 판단 요약 + 일시정지/재개 + 상세(/dashboard/paper-trading) 링크.
 * ⚠️ 가상 체결(수수료·제세금·슬리피지 반영) — 실제 주문 없음.
 */

"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatMoney } from "@/lib/utils/formatMoney";
import { isApiError } from "@/lib/api/errors";
import { usePaperTradingSession } from "@/hooks/paperTrading/usePaperTradingSession";
import { INTRADAY_PAPER_COPY as P } from "@/lib/copy/stock/intradayRead";
import {
  ACTION_LABEL,
  PAPER_TRADING_PAUSE,
  PAPER_TRADING_RESUME,
  STATUS_LABEL,
} from "@/lib/copy/paperTrading/labels";
import type {
  PaperTradingSelectedStock,
  PaperTradingSession,
  PaperTradingSessionDetail,
} from "@/lib/types/paperTrading/paperTrading";

export interface IntradayPaperControlsProps {
  stock: PaperTradingSelectedStock;
  /** 이 종목에 대응하는 cli-agent 세션 — 없으면 시작 폼을 보여준다. */
  session: PaperTradingSession | null;
  isCreating: boolean;
  onStart: (
    stock: PaperTradingSelectedStock,
    initialCash: number,
  ) => Promise<PaperTradingSessionDetail>;
}

export function IntradayPaperControls({
  stock,
  session,
  isCreating,
  onStart,
}: IntradayPaperControlsProps) {
  return (
    <div className="flex flex-col gap-xs rounded-md bg-surface-muted p-sm">
      <div className="flex items-center gap-xs">
        <span className="text-body-sm-strong text-text-strong">{P.title}</span>
        <span className="badge-info">{P.badge}</span>
        <span className="ml-auto text-caption text-text-muted">{P.disclaimer}</span>
      </div>
      {session ? (
        <SessionSummary session={session} />
      ) : (
        <StartForm stock={stock} isCreating={isCreating} onStart={onStart} />
      )}
    </div>
  );
}

// ─── 시작 폼 (세션 없음) ──────────────────────────────────────────────────────

function StartForm({
  stock,
  isCreating,
  onStart,
}: Pick<IntradayPaperControlsProps, "stock" | "isCreating" | "onStart">) {
  const [cash, setCash] = useState("10000000");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(cash.replace(/[^0-9]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(P.cashInvalid);
      return;
    }
    setError(null);
    try {
      await onStart(stock, amount);
    } catch (err) {
      setError(isApiError(err) ? err.message : P.error);
    }
  }

  return (
    <form className="flex flex-col gap-xs" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-center gap-xs">
        <label className="flex items-center gap-xs text-caption text-text-muted">
          <span>{P.cashLabel}</span>
          <input
            className="h-input-h w-[10rem] rounded-md border border-border-line bg-surface-base px-md text-body-sm text-text-strong tabular-nums"
            inputMode="numeric"
            value={cash}
            onChange={(event) => setCash(event.target.value)}
          />
        </label>
        <button type="submit" className="button-primary" disabled={isCreating}>
          {isCreating ? P.creating : P.startLabel}
        </button>
      </div>
      <p className="text-caption text-text-muted">{P.startHint}</p>
      {error ? (
        <p className="text-caption text-signal-down" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

// ─── 세션 현황 (세션 있음) ────────────────────────────────────────────────────

function formatPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

/** ISO(UTC) → KST "HH:mm" — 틱 시각 표시용. */
function kstHhmm(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function SessionSummary({ session }: { session: PaperTradingSession }) {
  const { detail, isPatching, setStatus } = usePaperTradingSession(session.id);
  const current = detail?.session ?? session;
  const position = detail?.positions.find((item) => item.quantity >= 1) ?? null;
  const lastTick = detail?.ticks.at(-1) ?? null;
  const running = current.status === "running";

  return (
    <div className="flex flex-col gap-xs">
      <div className="flex flex-wrap items-center gap-sm text-body-sm">
        <span className="badge-info">{STATUS_LABEL[current.status]}</span>
        <span
          className={cn(
            "text-body-sm-strong tabular-nums",
            current.returnPct >= 0 ? "text-signal-up" : "text-signal-down",
          )}
        >
          {P.metricReturn} {formatPct(current.returnPct)}
        </span>
        <span className="text-text-muted tabular-nums">
          {P.metricValue} {formatMoney(current.portfolioValue)}
        </span>
        <span className="text-text-muted tabular-nums">
          {P.metricCash} {formatMoney(current.cash)}
        </span>
        <div className="ml-auto flex items-center gap-xs">
          <button
            type="button"
            className="button-secondary inline-flex items-center gap-xs"
            disabled={isPatching}
            onClick={() => setStatus(running ? "paused" : "running")}
          >
            {running ? (
              <Pause className="size-3" aria-hidden />
            ) : (
              <Play className="size-3" aria-hidden />
            )}
            {running ? PAPER_TRADING_PAUSE : PAPER_TRADING_RESUME}
          </button>
          <Link href={`/dashboard/paper-trading/${current.id}`} className="button-secondary">
            {P.detailLink}
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-sm text-caption text-text-muted">
        <span className="tabular-nums">
          {P.positionLabel}{" "}
          {position
            ? `${position.quantity}주 · 평단 ${formatMoney(position.avgEntryPrice)} · 미실현 ${formatPct(position.unrealizedPnlPct)}`
            : P.positionNone}
        </span>
        <span className="tabular-nums">
          {P.ticksLabel} {detail ? `${detail.ticks.length}회` : "—"}
        </span>
      </div>

      <p className="truncate text-caption text-text-muted">
        {P.lastDecision}:{" "}
        {lastTick
          ? `${ACTION_LABEL[lastTick.decision.action]} · ${kstHhmm(lastTick.tickWindowStart)} — ${lastTick.rationale}`
          : P.noDecision}
      </p>
    </div>
  );
}
