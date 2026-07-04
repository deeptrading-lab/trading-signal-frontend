/**
 * IntradayPaperDetailSheet — 모의 단타 카드 클릭 시 뜨는 상세 모달. intraday-paper-watch.
 *
 * 공용 모달 시트 패턴(backdrop + 모바일 풀스크린/sm+ 중앙 모달 + Escape 닫기).
 * 종목별 현황(수익률·평가·포지션) + **체결 내역 표(거래별 비용·실현손익 ±)** + 최근 판단 로그.
 * ⚠️ 가상 체결 기록 — 실제 주문 없음.
 */

"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/utils/formatMoney";
import { usePaperTradingSession } from "@/hooks/paperTrading/usePaperTradingSession";
import { INTRADAY_PAPER_COPY as P } from "@/lib/copy/stock/intradayRead";
import {
  ACTION_LABEL,
  PAPER_TRADING_METRIC_CASH,
  PAPER_TRADING_METRIC_RETURN,
  PAPER_TRADING_METRIC_VALUE,
  STATUS_LABEL,
} from "@/lib/copy/paperTrading/labels";
import type {
  PaperTradingOrder,
  PaperTradingSession,
} from "@/lib/types/paperTrading/paperTrading";

function formatPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

/** ISO(UTC) → KST "MM/DD HH:mm". */
function kstTime(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

type OrderRow = PaperTradingOrder & { at: string };

interface IntradayPaperDetailSheetProps {
  session: PaperTradingSession;
  /** 카드가 아는 종목명 — 헤더 표기. */
  stockName: string;
  onClose: () => void;
}

export function IntradayPaperDetailSheet({
  session,
  stockName,
  onClose,
}: IntradayPaperDetailSheetProps) {
  const { detail } = usePaperTradingSession(session.id);
  const current = detail?.session ?? session;
  const ticks = detail?.ticks ?? [];
  const position = detail?.positions.find((item) => item.quantity >= 1) ?? null;

  // 체결 내역 — 틱 순서대로 평탄화 후 최신이 위로.
  const orders: OrderRow[] = ticks
    .flatMap((tick) => tick.orders.map((order) => ({ ...order, at: tick.tickWindowStart })))
    .reverse();
  const realizedSum = orders.reduce((sum, order) => sum + (order.realizedPnl ?? 0), 0);
  const recentDecisions = [...ticks].reverse().slice(0, 5);

  // Escape 로 닫기 + 배경 스크롤 잠금(공용 모달 시트 패턴).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // 포털 — 워치 표(tbody) 안에서 열려도 DOM 중첩 위반 없이 body 에 띄운다(열림 시에만 렌더 = 클라 전용).
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex sm:items-center sm:justify-center sm:p-lg"
      role="dialog"
      aria-modal="true"
      aria-label={`${stockName} ${P.sheet.ariaLabel}`}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative flex flex-col bg-surface shadow-lg overflow-hidden",
          "w-full h-full",
          "sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-[48rem] sm:rounded-2xl",
        )}
      >
        {/* 헤더 — 고정, 본문 스크롤 */}
        <div className="flex-none flex flex-col gap-xs px-lg py-md border-b border-border-line">
          <div className="flex items-center justify-between gap-md">
            <div className="min-w-0 flex-1 truncate text-h1 font-bold text-text-strong">
              {stockName}
            </div>
            <button
              type="button"
              aria-label={P.sheet.close}
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-muted hover:text-text-strong"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-x-sm gap-y-xs text-caption text-text-muted">
            <Badge variant="info">{STATUS_LABEL[current.status]}</Badge>
            <span>{current.name}</span>
            <span aria-hidden="true">·</span>
            <span>{P.disclaimer}</span>
          </div>
        </div>

        <div className="flex flex-col gap-lg overflow-y-auto px-lg py-md">
          {/* 지표 그리드 */}
          <div className="grid grid-cols-2 gap-sm sm:grid-cols-4">
            <Metric
              label={PAPER_TRADING_METRIC_RETURN}
              value={formatPct(current.returnPct)}
              tone={current.returnPct >= 0 ? "up" : "down"}
            />
            <Metric label={PAPER_TRADING_METRIC_VALUE} value={formatMoney(current.portfolioValue)} />
            <Metric label={PAPER_TRADING_METRIC_CASH} value={formatMoney(current.cash)} />
            <Metric label={P.sheet.metricInitial} value={formatMoney(current.initialCash)} />
          </div>

          {/* 포지션 현황 */}
          <p className="text-body-sm text-text-muted tabular-nums">
            {P.positionLabel}{" "}
            {position ? (
              <>
                {position.quantity}주 · 평단 {formatMoney(position.avgEntryPrice)} · 현재{" "}
                {formatMoney(position.lastPrice)} ·{" "}
                <span className={position.unrealizedPnl >= 0 ? "text-signal-up" : "text-signal-down"}>
                  미실현 {formatMoney(position.unrealizedPnl)} ({formatPct(position.unrealizedPnlPct)})
                </span>
              </>
            ) : (
              P.positionNone
            )}
          </p>

          {/* 체결 내역 표 */}
          <section className="flex flex-col gap-xs" aria-label={P.sheet.ordersTitle}>
            <div className="flex items-baseline justify-between gap-sm">
              <h3 className="text-h2 text-text-strong">{P.sheet.ordersTitle}</h3>
              <span
                className={cn(
                  "text-body-sm-strong tabular-nums",
                  realizedSum >= 0 ? "text-signal-up" : "text-signal-down",
                )}
              >
                {P.sheet.metricRealized} {realizedSum >= 0 ? "+" : ""}
                {formatMoney(realizedSum)}
              </span>
            </div>
            {orders.length === 0 ? (
              <p className="text-body-sm text-text-muted">{P.sheet.ordersEmpty}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-body-sm">
                  <thead>
                    <tr className="text-left text-caption text-text-muted">
                      <th className="py-xs pr-md font-normal">{P.sheet.colTime}</th>
                      <th className="py-xs pr-md font-normal">{P.sheet.colSide}</th>
                      <th className="py-xs pr-md text-right font-normal">{P.sheet.colQty}</th>
                      <th className="py-xs pr-md text-right font-normal">{P.sheet.colPrice}</th>
                      <th className="py-xs pr-md text-right font-normal">{P.sheet.colNotional}</th>
                      <th className="py-xs pr-md text-right font-normal">{P.sheet.colCost}</th>
                      <th className="py-xs pr-md text-right font-normal">{P.sheet.colPnl}</th>
                      <th className="py-xs text-left font-normal">{P.sheet.colNote}</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {orders.map((order, index) => (
                      <tr key={`${order.at}-${index}`} className="border-t border-border-line">
                        <td className="py-xs pr-md whitespace-nowrap text-text-muted">
                          {kstTime(order.at)}
                        </td>
                        <td
                          className={cn(
                            "py-xs pr-md font-medium",
                            order.side === "BUY" ? "text-signal-up" : "text-signal-down",
                          )}
                        >
                          {order.side === "BUY" ? P.sheet.sideBuy : P.sheet.sideSell}
                        </td>
                        <td className="py-xs pr-md text-right">{order.quantity}</td>
                        <td className="py-xs pr-md text-right">{formatMoney(order.price)}</td>
                        <td className="py-xs pr-md text-right">{formatMoney(order.notional)}</td>
                        <td className="py-xs pr-md text-right text-text-muted">
                          {formatMoney(order.costKrw ?? 0)}
                        </td>
                        <td className="py-xs pr-md text-right">
                          {order.realizedPnl != null ? (
                            <span
                              className={
                                order.realizedPnl >= 0 ? "text-signal-up" : "text-signal-down"
                              }
                            >
                              {order.realizedPnl >= 0 ? "+" : ""}
                              {formatMoney(order.realizedPnl)}
                            </span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                        {/* 왜 이런 판단 — 주문을 만든 결정의 근거 메모(전문은 title). */}
                        <td
                          className="max-w-[18rem] truncate py-xs text-left text-caption text-text-muted"
                          title={order.reason}
                        >
                          {order.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 최근 판단 로그 */}
          <section className="flex flex-col gap-xs" aria-label={P.sheet.decisionsTitle}>
            <h3 className="text-h2 text-text-strong">{P.sheet.decisionsTitle}</h3>
            {recentDecisions.length === 0 ? (
              <p className="text-body-sm text-text-muted">{P.noDecision}</p>
            ) : (
              <ul className="flex flex-col gap-xs">
                {recentDecisions.map((tick) => {
                  // 룰 조정 = 판단 게이트(decision.gateAdjustments) + 체결 가드(tick.guardAdjustments).
                  const adjustments = [
                    ...(tick.decision.gateAdjustments ?? []),
                    ...tick.guardAdjustments,
                  ];
                  return (
                    <li key={tick.id} className="rounded-md bg-surface-muted p-sm">
                      <div className="flex flex-wrap items-center gap-sm text-caption text-text-muted">
                        <span className="tabular-nums">{kstTime(tick.tickWindowStart)}</span>
                        <span className="text-body-sm-strong text-text-strong">
                          {ACTION_LABEL[tick.decision.action]}
                        </span>
                        <span
                          className={cn(
                            "ml-auto tabular-nums",
                            tick.returnPctAfter >= 0 ? "text-signal-up" : "text-signal-down",
                          )}
                        >
                          {formatPct(tick.returnPctAfter)}
                        </span>
                      </div>
                      <p className="mt-xs text-body-sm text-text-muted">{tick.rationale}</p>
                      {tick.decision.analystNote ? (
                        <p className="mt-xs text-caption text-text-muted line-clamp-2">
                          {P.sheet.analystPrefix}: {tick.decision.analystNote}
                        </p>
                      ) : null}
                      {adjustments.length > 0 ? (
                        <p className="mt-xs text-caption text-text-muted">
                          {P.sheet.gatePrefix}: {adjustments.join(" · ")}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="rounded-md bg-surface-muted p-sm">
      <p className="text-caption text-text-muted">{label}</p>
      <p
        className={cn(
          "text-body-md font-bold tabular-nums",
          tone === "up" ? "text-signal-up" : tone === "down" ? "text-signal-down" : "text-text-strong",
        )}
      >
        {value}
      </p>
    </div>
  );
}
