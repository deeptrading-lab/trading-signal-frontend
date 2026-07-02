"use client";

/**
 * PaperTradingDetailContainer — 모의 매매 세션 상세(전체 화면). intraday-paper-watch 재디자인.
 *
 * 역할: 한 세션의 모의 매매 전부를 보는 페이지 — 성과 지표(실현손익·비용 포함), 자산 곡선,
 * 포지션 현황, **체결 내역 표(비용·실현손익·판단 메모)**, 판단 타임라인(최신순, 진단·룰 조정).
 * 정리한 것: 목표 수익률/달성률 카드(단타에 무의미한 파생값), 최신 판단 별도 카드(타임라인
 * 최신 항목과 중복), cli-agent 세션의 "지금 재판단"(자동 틱이 담당 — mock 세션에만 노출).
 * 뒤로가기는 단타 워치(/intraday) — 구 목록 페이지(/dashboard/paper-trading)는 레거시.
 */

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePaperTradingSession } from "@/hooks/paperTrading/usePaperTradingSession";
import { cn } from "@/lib/utils/cn";
import {
  ACTION_LABEL,
  PAPER_TRADING_ANALYST_PREFIX,
  PAPER_TRADING_AUTO_TICK_NOTE,
  PAPER_TRADING_BACK_TO_WATCH,
  PAPER_TRADING_COMPLETE,
  PAPER_TRADING_DETAIL_TITLE,
  PAPER_TRADING_EQUITY_TITLE,
  PAPER_TRADING_ERROR,
  PAPER_TRADING_GATE_PREFIX,
  PAPER_TRADING_METRIC_CASH,
  PAPER_TRADING_METRIC_COSTS,
  PAPER_TRADING_METRIC_INITIAL,
  PAPER_TRADING_METRIC_REALIZED,
  PAPER_TRADING_METRIC_RETURN,
  PAPER_TRADING_METRIC_VALUE,
  PAPER_TRADING_NO_POSITION,
  PAPER_TRADING_ORDER_BUY,
  PAPER_TRADING_ORDER_COLS,
  PAPER_TRADING_ORDER_SELL,
  PAPER_TRADING_ORDERS_EMPTY,
  PAPER_TRADING_ORDERS_TITLE,
  PAPER_TRADING_PAUSE,
  PAPER_TRADING_POSITIONS_TITLE,
  PAPER_TRADING_REAL_ACTION_NOTICE,
  PAPER_TRADING_REFRESH,
  PAPER_TRADING_RESUME,
  PAPER_TRADING_RETRY,
  PAPER_TRADING_RUN_TICK,
  PAPER_TRADING_RUNNING_TICK,
  PAPER_TRADING_TABLE_ALLOC,
  PAPER_TRADING_TABLE_AVG,
  PAPER_TRADING_TABLE_PNL,
  PAPER_TRADING_TABLE_PRICE,
  PAPER_TRADING_TABLE_QUANTITY,
  PAPER_TRADING_TABLE_VALUE,
  PAPER_TRADING_TIMELINE_TITLE,
  STATUS_LABEL,
} from "@/lib/copy/paperTrading/labels";
import type {
  PaperTradingEquityPoint,
  PaperTradingOrder,
} from "@/lib/types/paperTrading/paperTrading";

export interface PaperTradingDetailContainerProps {
  sessionId: string;
}

type OrderRow = PaperTradingOrder & { at: string };

export function PaperTradingDetailContainer({ sessionId }: PaperTradingDetailContainerProps) {
  const {
    detail,
    isLoading,
    isError,
    isFetching,
    isRunningTick,
    isPatching,
    runTick,
    setStatus,
    refetch,
  } = usePaperTradingSession(sessionId);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-main-max-w">
        <div className="card skeleton min-h-[260px]" aria-busy="true" />
      </div>
    );
  }

  if (isError || !detail) {
    return (
      <div className="mx-auto w-full max-w-main-max-w">
        <div className="card-critical" role="alert">
          <p className="text-body-strong">{PAPER_TRADING_ERROR}</p>
          <button type="button" className="button-secondary mt-md" onClick={() => refetch()}>
            {PAPER_TRADING_RETRY}
          </button>
        </div>
      </div>
    );
  }

  const { session, positions, ticks, equityCurve } = detail;
  const canRun = session.status === "running";
  const isIntraday = session.decisionProvider === "cli-agent";
  const title = session.stocks[0]?.name ?? session.name ?? PAPER_TRADING_DETAIL_TITLE;

  // 체결 평탄화(최신 위) + 실현손익·비용 누계 — "모의 매매한 걸 다 본다"의 핵심 파생값.
  const orders: OrderRow[] = ticks
    .flatMap((tick) => tick.orders.map((order) => ({ ...order, at: tick.tickWindowStart })))
    .reverse();
  const realizedSum = orders.reduce((sum, order) => sum + (order.realizedPnl ?? 0), 0);
  const costSum = orders.reduce((sum, order) => sum + (order.costKrw ?? 0), 0);
  const latestTicks = [...ticks].reverse();

  return (
    <div className="mx-auto flex w-full max-w-main-max-w flex-col gap-lg">
      {/* 헤더 — 뒤로가기(단타 워치)·종목명·상태·주기·컨트롤 */}
      <div className="flex flex-wrap items-start justify-between gap-md">
        <header className="flex flex-col gap-xs">
          <Link
            href="/intraday"
            className="inline-flex items-center gap-xs text-body-sm text-text-muted hover:text-text-strong"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {PAPER_TRADING_BACK_TO_WATCH}
          </Link>
          <div className="flex flex-wrap items-center gap-sm">
            <h1 className="text-h1 text-text-strong">{title}</h1>
            <span className="badge-info">{STATUS_LABEL[session.status]}</span>
            <span className="rounded-pill bg-surface-muted px-sm py-[2px] text-caption text-text-muted tabular-nums">
              {session.tickIntervalMinutes}분 주기
            </span>
            <span className="text-caption text-text-muted tabular-nums">
              판단 {ticks.length}회 · 체결 {orders.length}건
            </span>
          </div>
          <p className="text-body-sm text-text-muted">{PAPER_TRADING_REAL_ACTION_NOTICE}</p>
        </header>

        <div className="flex flex-wrap gap-sm">
          <button
            type="button"
            className="button-secondary inline-flex items-center gap-xs"
            onClick={() => refetch()}
          >
            <RefreshCw className={cn("size-4", isFetching && "animate-spin")} aria-hidden />
            {PAPER_TRADING_REFRESH}
          </button>
          <button
            type="button"
            className="button-secondary inline-flex items-center gap-xs"
            onClick={() => setStatus(canRun ? "paused" : "running")}
            disabled={isPatching || session.status === "completed"}
          >
            {canRun ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
            {canRun ? PAPER_TRADING_PAUSE : PAPER_TRADING_RESUME}
          </button>
          <button
            type="button"
            className="button-secondary inline-flex items-center gap-xs"
            onClick={() => setStatus("completed")}
            disabled={isPatching || session.status === "completed"}
          >
            <CheckCircle2 className="size-4" aria-hidden />
            {PAPER_TRADING_COMPLETE}
          </button>
        </div>
      </div>

      {/* 성과 지표 — 수익률·평가·현금·시작금 + 실현손익·비용(단타 성과 평가의 실질값) */}
      <section className="grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-6" aria-label="모의투자 요약">
        <MetricCard
          label={PAPER_TRADING_METRIC_RETURN}
          value={formatPct(session.returnPct)}
          tone={session.returnPct >= 0 ? "up" : "down"}
        />
        <MetricCard label={PAPER_TRADING_METRIC_VALUE} value={formatNumber(session.portfolioValue)} />
        <MetricCard label={PAPER_TRADING_METRIC_CASH} value={formatNumber(session.cash)} />
        <MetricCard label={PAPER_TRADING_METRIC_INITIAL} value={formatNumber(session.initialCash)} />
        <MetricCard
          label={PAPER_TRADING_METRIC_REALIZED}
          value={`${realizedSum >= 0 ? "+" : ""}${formatNumber(realizedSum)}`}
          tone={realizedSum > 0 ? "up" : realizedSum < 0 ? "down" : undefined}
        />
        <MetricCard label={PAPER_TRADING_METRIC_COSTS} value={formatNumber(costSum)} />
      </section>

      {/* 자산 곡선 + 포지션 현황 */}
      <div className="grid gap-md lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
        <section className="card min-h-[320px]">
          <div className="mb-md flex items-center justify-between gap-md">
            <h2 className="text-h2 text-text-strong">{PAPER_TRADING_EQUITY_TITLE}</h2>
            {isIntraday ? (
              <span className="text-caption text-text-muted">{PAPER_TRADING_AUTO_TICK_NOTE}</span>
            ) : (
              <button
                type="button"
                className="button-primary inline-flex items-center gap-xs"
                onClick={() => runTick()}
                disabled={!canRun || isRunningTick}
              >
                <RotateCcw className={cn("size-4", isRunningTick && "animate-spin")} aria-hidden />
                {isRunningTick ? PAPER_TRADING_RUNNING_TICK : PAPER_TRADING_RUN_TICK}
              </button>
            )}
          </div>
          <EquityCurveChart points={equityCurve} />
        </section>

        <section className="card">
          <h2 className="text-h2 text-text-strong">{PAPER_TRADING_POSITIONS_TITLE}</h2>
          {positions.length === 0 ? (
            <p className="mt-md text-body-sm text-text-muted">{PAPER_TRADING_NO_POSITION}</p>
          ) : (
            <div className="mt-md flex flex-col gap-sm">
              {positions.map((position) => (
                <div key={position.ticker} className="rounded-md bg-surface-muted p-sm text-body-sm">
                  <div className="flex items-center justify-between gap-sm">
                    <span className="text-body-sm-strong text-text-strong">
                      {position.name ?? position.ticker}
                    </span>
                    <span
                      className={cn(
                        "text-body-sm-strong tabular-nums",
                        position.unrealizedPnlPct >= 0 ? "text-signal-up" : "text-signal-down",
                      )}
                    >
                      {formatPct(position.unrealizedPnlPct)}
                    </span>
                  </div>
                  <dl className="mt-xs grid grid-cols-2 gap-x-md gap-y-[2px] text-caption text-text-muted tabular-nums">
                    <div className="flex justify-between gap-sm">
                      <dt>{PAPER_TRADING_TABLE_QUANTITY}</dt>
                      <dd>{formatNumber(position.quantity)}주</dd>
                    </div>
                    <div className="flex justify-between gap-sm">
                      <dt>{PAPER_TRADING_TABLE_AVG}</dt>
                      <dd>{formatNumber(position.avgEntryPrice)}</dd>
                    </div>
                    <div className="flex justify-between gap-sm">
                      <dt>{PAPER_TRADING_TABLE_PRICE}</dt>
                      <dd>{formatNumber(position.lastPrice)}</dd>
                    </div>
                    <div className="flex justify-between gap-sm">
                      <dt>{PAPER_TRADING_TABLE_VALUE}</dt>
                      <dd>{formatNumber(position.marketValue)}</dd>
                    </div>
                    <div className="flex justify-between gap-sm">
                      <dt>{PAPER_TRADING_TABLE_PNL}</dt>
                      <dd className={position.unrealizedPnl >= 0 ? "text-signal-up" : "text-signal-down"}>
                        {position.unrealizedPnl >= 0 ? "+" : ""}
                        {formatNumber(position.unrealizedPnl)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-sm">
                      <dt>{PAPER_TRADING_TABLE_ALLOC}</dt>
                      <dd>{formatPct(position.allocationPct, false)}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 체결 내역 — 거래별 비용·실현손익·판단 메모(왜 이런 매매) */}
      <section className="card">
        <div className="flex items-baseline justify-between gap-md">
          <h2 className="text-h2 text-text-strong">{PAPER_TRADING_ORDERS_TITLE}</h2>
          <span
            className={cn(
              "text-body-sm-strong tabular-nums",
              realizedSum >= 0 ? "text-signal-up" : "text-signal-down",
            )}
          >
            {PAPER_TRADING_METRIC_REALIZED} {realizedSum >= 0 ? "+" : ""}
            {formatNumber(realizedSum)}
          </span>
        </div>
        {orders.length === 0 ? (
          <p className="mt-md text-body-sm text-text-muted">{PAPER_TRADING_ORDERS_EMPTY}</p>
        ) : (
          <div className="mt-md overflow-x-auto">
            <table className="w-full min-w-[760px] text-body-sm">
              <thead>
                <tr className="text-left text-caption text-text-muted">
                  <th className="py-xs pr-md font-normal">{PAPER_TRADING_ORDER_COLS.time}</th>
                  <th className="py-xs pr-md font-normal">{PAPER_TRADING_ORDER_COLS.side}</th>
                  <th className="py-xs pr-md text-right font-normal">{PAPER_TRADING_ORDER_COLS.qty}</th>
                  <th className="py-xs pr-md text-right font-normal">{PAPER_TRADING_ORDER_COLS.price}</th>
                  <th className="py-xs pr-md text-right font-normal">{PAPER_TRADING_ORDER_COLS.notional}</th>
                  <th className="py-xs pr-md text-right font-normal">{PAPER_TRADING_ORDER_COLS.cost}</th>
                  <th className="py-xs pr-md text-right font-normal">{PAPER_TRADING_ORDER_COLS.pnl}</th>
                  <th className="py-xs text-left font-normal">{PAPER_TRADING_ORDER_COLS.note}</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {orders.map((order, index) => (
                  <tr key={`${order.at}-${index}`} className="border-t border-border-line">
                    <td className="py-xs pr-md whitespace-nowrap text-text-muted">
                      {formatDate(order.at)}
                    </td>
                    <td
                      className={cn(
                        "py-xs pr-md font-medium",
                        order.side === "BUY" ? "text-signal-up" : "text-signal-down",
                      )}
                    >
                      {order.side === "BUY" ? PAPER_TRADING_ORDER_BUY : PAPER_TRADING_ORDER_SELL}
                    </td>
                    <td className="py-xs pr-md text-right">{formatNumber(order.quantity)}</td>
                    <td className="py-xs pr-md text-right">{formatNumber(order.price)}</td>
                    <td className="py-xs pr-md text-right">{formatNumber(order.notional)}</td>
                    <td className="py-xs pr-md text-right text-text-muted">
                      {formatNumber(order.costKrw ?? 0)}
                    </td>
                    <td className="py-xs pr-md text-right">
                      {order.realizedPnl != null ? (
                        <span className={order.realizedPnl >= 0 ? "text-signal-up" : "text-signal-down"}>
                          {order.realizedPnl >= 0 ? "+" : ""}
                          {formatNumber(order.realizedPnl)}
                        </span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="max-w-[20rem] truncate py-xs text-left text-caption text-text-muted" title={order.reason}>
                      {order.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 판단 타임라인 — 최신순, 판단 근거·흐름 진단·룰 조정까지(사후 분석용) */}
      <section className="card">
        <h2 className="text-h2 text-text-strong">{PAPER_TRADING_TIMELINE_TITLE}</h2>
        <div className="mt-md flex flex-col gap-sm">
          {latestTicks.map((tick) => {
            const adjustments = [
              ...(tick.decision.gateAdjustments ?? []),
              ...tick.guardAdjustments,
            ];
            return (
              <article key={tick.id} className="rounded-md border border-border-line bg-surface-base p-md">
                <div className="flex flex-wrap items-center justify-between gap-sm">
                  <div className="flex items-baseline gap-sm">
                    <p className="text-body-strong text-text-strong">
                      {ACTION_LABEL[tick.decision.action]}
                    </p>
                    <p className="text-caption text-text-muted tabular-nums">
                      #{tick.tickIndex + 1} · {formatDate(tick.tickWindowStart)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-body-strong tabular-nums",
                      tick.returnPctAfter >= 0 ? "text-signal-up" : "text-signal-down",
                    )}
                  >
                    {formatPct(tick.returnPctAfter)}
                  </span>
                </div>
                <p className="mt-sm text-body-sm text-text-muted">{tick.rationale}</p>
                {tick.decision.analystNote ? (
                  <p className="mt-xs text-caption text-text-muted line-clamp-2">
                    {PAPER_TRADING_ANALYST_PREFIX}: {tick.decision.analystNote}
                  </p>
                ) : null}
                {adjustments.length > 0 ? (
                  <p className="mt-xs text-caption text-text-muted">
                    {PAPER_TRADING_GATE_PREFIX}: {adjustments.join(" · ")}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="card">
      <p className="text-caption text-text-muted">{label}</p>
      <p
        className={cn(
          "mt-xs text-h2 tabular-nums text-text-strong",
          tone === "up" && "text-signal-up",
          tone === "down" && "text-signal-down",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function EquityCurveChart({ points }: { points: PaperTradingEquityPoint[] }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <XAxis dataKey="tickIndex" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} width={48} domain={["auto", "auto"]} />
          <Tooltip
            formatter={(value) => [formatNumber(Number(value)), "평가금액"]}
            labelFormatter={(label) => (Number(label) < 0 ? "시작" : `tick ${Number(label) + 1}`)}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-accent-vivid)"
            strokeWidth={3}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatNumber(value: number): string {
  return value.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

function formatPct(value: number, sign = true): string {
  const prefix = sign && value >= 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
