"use client";

/**
 * PaperTradingDetailContainer — 모의 매매 세션 상세(전체 화면). intraday-paper-watch 재디자인.
 *
 * 역할: 한 세션의 모의 매매 전부를 보는 페이지 — 성과 지표(실현손익·비용 포함), 자산 곡선,
 * 포지션 현황, **체결 내역 표(비용·실현손익·판단 메모)**, 판단 타임라인(최신순, 진단·룰 조정).
 * 정리한 것: 목표 수익률/달성률 카드(단타에 무의미한 파생값), 최신 판단 별도 카드(타임라인
 * 최신 항목과 중복), cli-agent 세션의 "지금 재판단"(자동 틱이 담당 — mock 세션에만 노출).
 * 라우트는 `/intraday/[sessionId]`(단타 목록의 "전체화면" 진입점). 뒤로가기는 단타 워치(/intraday).
 * (구 `/dashboard/paper-trading` 목록/상세는 은퇴 — 단타로 일원화.)
 */

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  CheckCircle2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { usePaperTradingSession } from "@/hooks/paperTrading/usePaperTradingSession";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/Badge";
import { Divider } from "@/components/ui/Divider";
import { Skeleton } from "@/components/ui/Skeleton";
import { fmtCost, fmtTokensApprox } from "@/components/analyze/format";
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
  PAPER_TRADING_METRIC_TOKEN_COST,
  PAPER_TRADING_METRIC_TOKENS,
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
import { formatNumber, formatPct } from "./format";
import type { PaperTradingOrder } from "@/lib/types/paperTrading/paperTrading";

/**
 * 자산 곡선 — recharts 를 쓰는 유일한 섹션이라 지연 로드(mobile-perf-bundle).
 * `/intraday/[sessionId]` 진입 번들에서 recharts 이탈, 차트 실높이(260px) 스켈레톤 미러.
 */
const PaperTradingEquityChart = dynamic(
  () =>
    import("./PaperTradingEquityChart").then((m) => m.PaperTradingEquityChart),
  {
    ssr: false,
    loading: () => <Skeleton variant="block" className="h-[260px] w-full" />,
  },
);

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

  // 장중 자동 갱신은 세션 상세 쿼리(useQueryPaperTradingSession)의 refetchInterval 이 담당한다 —
  // 종료 세션·장외는 스스로 멈춘다. 화면별 폴링 타이머를 따로 두지 않는다(intraday-live-refresh).

  if (isLoading) {
    // 카드 박스 스켈레톤 제거 — 흰 바탕 위 플랫 스켈레톤(제목 라인 + 차트 블록).
    return (
      <div className="mx-auto flex w-full max-w-main-max-w flex-col gap-md" aria-busy="true">
        <Skeleton variant="line" className="h-6 w-40" />
        <Skeleton variant="block" className="h-[260px] w-full rounded-lg" />
      </div>
    );
  }

  if (isError || !detail) {
    // card-critical 박스 제거 — 흰 바탕 위 플랫 알림.
    return (
      <div className="mx-auto w-full max-w-main-max-w">
        <div className="flex flex-col items-start gap-md py-md" role="alert">
          <p className="text-body-md font-bold text-critical">{PAPER_TRADING_ERROR}</p>
          <button type="button" className="button-secondary" onClick={() => refetch()}>
            {PAPER_TRADING_RETRY}
          </button>
        </div>
      </div>
    );
  }

  const { session, positions, ticks, equityCurve } = detail;
  const canRun = session.status === "running";
  const isIntraday = session.decisionProvider === "cli-agent";
  // 단타(단일 종목)는 종목명이 곧 정체성, mock 다종목 세션은 사용자가 지은 세션명 유지(리뷰 #10).
  const title = isIntraday
    ? (session.stocks[0]?.name ?? session.name ?? PAPER_TRADING_DETAIL_TITLE)
    : (session.name || PAPER_TRADING_DETAIL_TITLE);

  // 체결 평탄화(최신 위) + 실현손익·비용 누계 — "모의 매매한 걸 다 본다"의 핵심 파생값.
  const orders: OrderRow[] = ticks
    .flatMap((tick) => tick.orders.map((order) => ({ ...order, at: tick.tickWindowStart })))
    .reverse();
  const realizedSum = orders.reduce((sum, order) => sum + (order.realizedPnl ?? 0), 0);
  const costSum = orders.reduce((sum, order) => sum + (order.costKrw ?? 0), 0);
  const latestTicks = [...ticks].reverse();

  // 세션 누적 CLI 토큰·환산 비용 — 틱에 내장된 에이전트별 usage 합산(구독 기반, 실제 과금 아님).
  const usageTotals = ticks.reduce(
    (acc, tick) => {
      for (const usage of [tick.decision.analystUsage, tick.decision.judgeUsage]) {
        if (!usage) continue;
        acc.tokens += (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
        acc.cost += usage.costUsd ?? 0;
        acc.calls += 1;
      }
      return acc;
    },
    { tokens: 0, cost: 0, calls: 0 },
  );

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
            <Badge variant="info">{STATUS_LABEL[session.status]}</Badge>
            <span className="rounded-pill bg-surface-muted px-sm py-xs text-caption text-text-muted tabular-nums">
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

      {/* 성과 지표 — 카드 박스 제거, 흰 바탕 위 플랫 KPI 행(라벨 캡션 + 값 강조). */}
      <section className="flex flex-col gap-md" aria-label="모의투자 요약">
        <dl className="grid grid-cols-2 gap-x-lg gap-y-md sm:grid-cols-4 lg:grid-cols-8">
          <Stat
            label={PAPER_TRADING_METRIC_RETURN}
            value={formatPct(session.returnPct)}
            tone={session.returnPct >= 0 ? "up" : "down"}
          />
          <Stat label={PAPER_TRADING_METRIC_VALUE} value={formatNumber(session.portfolioValue)} />
          <Stat label={PAPER_TRADING_METRIC_CASH} value={formatNumber(session.cash)} />
          <Stat label={PAPER_TRADING_METRIC_INITIAL} value={formatNumber(session.initialCash)} />
          <Stat
            label={PAPER_TRADING_METRIC_REALIZED}
            value={`${realizedSum >= 0 ? "+" : ""}${formatNumber(realizedSum)}`}
            tone={realizedSum > 0 ? "up" : realizedSum < 0 ? "down" : undefined}
          />
          <Stat label={PAPER_TRADING_METRIC_COSTS} value={formatNumber(costSum)} />
          <Stat
            label={PAPER_TRADING_METRIC_TOKENS}
            value={usageTotals.calls > 0 ? `${fmtTokensApprox(usageTotals.tokens)} 토큰` : "—"}
          />
          <Stat
            label={PAPER_TRADING_METRIC_TOKEN_COST}
            value={usageTotals.calls > 0 ? fmtCost(usageTotals.cost) : "—"}
          />
        </dl>
      </section>

      <Divider />

      {/* 자산 곡선 + 포지션 현황 — 카드 박스 제거, 흰 바탕 위 플랫 2열(모바일 1열). */}
      <div className="grid gap-lg lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
        {/* min-w-0 — 그리드 셀 최소폭 자동값이 차트 측정 실패(width -1 경고)를 유발하지 않게. */}
        <section className="flex min-w-0 flex-col gap-md">
          <div className="flex items-center justify-between gap-md">
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
          <PaperTradingEquityChart points={equityCurve} initialCash={session.initialCash} />
        </section>

        <section className="flex flex-col gap-md">
          <h2 className="text-h2 text-text-strong">{PAPER_TRADING_POSITIONS_TITLE}</h2>
          {positions.length === 0 ? (
            <p className="text-body-sm text-text-muted">{PAPER_TRADING_NO_POSITION}</p>
          ) : (
            // 미니 카드(surface-muted 박스) 제거 → 흰 바탕 위 헤어라인 행(종목명 코드 미표시).
            <div role="list">
              {positions.map((position) => (
                <div
                  key={position.ticker}
                  role="listitem"
                  className="flex flex-col gap-xs border-b border-border-line py-md text-body-sm last:border-b-0"
                >
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
                  <dl className="grid grid-cols-2 gap-x-md gap-y-xs text-caption text-text-muted tabular-nums">
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

      <Divider />

      {/* 체결 내역 — 거래별 비용·실현손익·판단 메모(왜 이런 매매). 카드 박스 제거, 플랫 헤어라인 표. */}
      <section className="flex flex-col gap-md">
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
          <p className="text-body-sm text-text-muted">{PAPER_TRADING_ORDERS_EMPTY}</p>
        ) : (
          <div className="overflow-x-auto">
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

      <Divider />

      {/* 판단 타임라인 — 최신순 컴팩트 표. 카드 박스 제거, 플랫 헤어라인 표. 흐름 진단 전문은 근거 hover. */}
      <section className="flex flex-col gap-md">
        <h2 className="text-h2 text-text-strong">{PAPER_TRADING_TIMELINE_TITLE}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-body-sm">
            <thead>
              <tr className="text-left text-caption text-text-muted">
                <th className="py-xs pr-md font-normal">{PAPER_TRADING_ORDER_COLS.time}</th>
                <th className="py-xs pr-md font-normal">판단</th>
                <th className="py-xs pr-md text-right font-normal">수익률</th>
                <th className="py-xs font-normal">근거</th>
              </tr>
            </thead>
            <tbody>
              {latestTicks.map((tick) => {
                const adjustments = [
                  ...(tick.decision.gateAdjustments ?? []),
                  ...tick.guardAdjustments,
                ];
                return (
                  <tr key={tick.id} className="border-t border-border-line align-top">
                    <td className="whitespace-nowrap py-xs pr-md text-caption text-text-muted tabular-nums">
                      #{tick.tickIndex + 1} · {formatDate(tick.tickWindowStart)}
                    </td>
                    <td
                      className={cn(
                        "whitespace-nowrap py-xs pr-md font-medium",
                        actionTone(tick.decision.action),
                      )}
                    >
                      {ACTION_LABEL[tick.decision.action]}
                    </td>
                    <td
                      className={cn(
                        "whitespace-nowrap py-xs pr-md text-right tabular-nums",
                        tick.returnPctAfter >= 0 ? "text-signal-up" : "text-signal-down",
                      )}
                    >
                      {formatPct(tick.returnPctAfter)}
                    </td>
                    <td className="py-xs">
                      <p
                        className="text-caption text-text-strong"
                        title={
                          tick.decision.analystNote
                            ? `${PAPER_TRADING_ANALYST_PREFIX}: ${tick.decision.analystNote}`
                            : undefined
                        }
                      >
                        {tick.rationale}
                      </p>
                      {adjustments.length > 0 ? (
                        <p className="mt-xs text-caption text-text-muted">
                          {PAPER_TRADING_GATE_PREFIX}: {adjustments.join(" · ")}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/** 컴팩트 스탯 — 한 카드 안에서 라벨(캡션)+값(본문 강조)으로 6지표를 얇게. */
function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="flex flex-col gap-xs">
      <dt className="text-caption text-text-muted">{label}</dt>
      <dd
        className={cn(
          "text-body-md font-bold tabular-nums text-text-strong",
          tone === "up" && "text-signal-up",
          tone === "down" && "text-signal-down",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** 타임라인 판단 색 — 매수 계열 빨강 / 매도 계열 파랑 / 유지 중립(한국식). */
function actionTone(action: string): string {
  if (action === "BUY" || action === "INCREASE") return "text-signal-up";
  if (action === "SELL" || action === "REDUCE" || action === "EXIT") return "text-signal-down";
  return "text-text-muted";
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
