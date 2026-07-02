/**
 * IntradayWatchTable — 워치 종목 컴팩트 표 (토스 랭킹 표 스타일). intraday-paper-watch.
 *
 * 행 = 종목 | 현재가 | 등락률 | 모의 수익률 | 평가금액 | 포지션 | 최근 판단 | 액션(일시정지·제거·펼침).
 * 행 클릭(또는 펼침 버튼) → 아래로 확장: 장중 단타 판단(참고) 받기/결과 카드 + AI 모의 단타
 * 시작 폼(미시작) 또는 체결 내역 시트 진입(진행 중). 종목 코드는 표시하지 않는다(피드백).
 * ⚠️ 의사결정 보조·가상 체결 — 자동 수익/집행 주장 없음.
 */

"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { ChevronDown, Pause, Play, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatMoney } from "@/lib/utils/formatMoney";
import { isApiError } from "@/lib/api/errors";
import { useQueryAIProviders } from "@/hooks/stock/useQueryAIProviders";
import { useMutationIntradayRead } from "@/hooks/stock/useMutationIntradayRead";
import { usePaperTradingSession } from "@/hooks/paperTrading/usePaperTradingSession";
import { IntradayReadCard } from "@/components/stock/IntradayReadCard";
import { IntradayPaperDetailSheet } from "@/components/intraday/IntradayPaperDetailSheet";
import {
  INTRADAY_PAPER_COPY as P,
  INTRADAY_READ_COPY as C,
} from "@/lib/copy/stock/intradayRead";
import {
  ACTION_LABEL,
  PAPER_TRADING_PAUSE,
  PAPER_TRADING_RESUME,
  STATUS_LABEL,
} from "@/lib/copy/paperTrading/labels";
import type { WatchlistQuote } from "@/lib/api/watchlist/list";
import type {
  PaperTradingSelectedStock,
  PaperTradingSession,
  PaperTradingSessionDetail,
} from "@/lib/types/paperTrading/paperTrading";

const T = P.table;

/** 확장 패널·행 공용 컴팩트 버튼(utilities 가 components 레이어를 덮는다). */
const BTN_COMPACT = "px-sm py-xs text-caption";
const ICON_BTN =
  "inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-base hover:text-text-strong cursor-pointer disabled:opacity-40";

type WatchItem = { ticker: string; name: string };

export interface IntradayWatchTableProps {
  items: WatchItem[];
  /** 배치 시세(현재가·등락률) — 없으면 해당 셀 "—". */
  quotes: WatchlistQuote[];
  sessionByTicker: Map<string, PaperTradingSession>;
  isCreating: boolean;
  onStart: (
    stock: PaperTradingSelectedStock,
    initialCash: number,
  ) => Promise<PaperTradingSessionDetail>;
  onRemove: (ticker: string) => void;
}

export function IntradayWatchTable({
  items,
  quotes,
  sessionByTicker,
  isCreating,
  onStart,
  onRemove,
}: IntradayWatchTableProps) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="text-caption text-text-muted">
              <th className="py-sm pl-lg pr-md text-left font-normal">{T.colStock}</th>
              <th className="py-sm pr-md text-right font-normal">{T.colPrice}</th>
              <th className="py-sm pr-md text-right font-normal">{T.colChange}</th>
              <th className="py-sm pr-md text-right font-normal">{T.colReturn}</th>
              <th className="py-sm pr-md text-right font-normal">{T.colValue}</th>
              <th className="py-sm pr-md text-right font-normal">{T.colPosition}</th>
              <th className="py-sm pr-md text-left font-normal">{T.colLast}</th>
              <th className="py-sm pr-lg" aria-label="액션" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <WatchRow
                key={item.ticker}
                item={item}
                quote={quotes.find((q) => q.ticker === item.ticker) ?? null}
                session={sessionByTicker.get(item.ticker) ?? null}
                isCreating={isCreating}
                onStart={onStart}
                onRemove={() => onRemove(item.ticker)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 행 ───────────────────────────────────────────────────────────────────────

function formatPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

/** ISO(UTC) → KST "HH:mm". */
function kstHhmm(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function changeTone(value: number): string {
  if (value > 0) return "text-signal-up";
  if (value < 0) return "text-signal-down";
  return "text-text-muted";
}

function WatchRow({
  item,
  quote,
  session,
  isCreating,
  onStart,
  onRemove,
}: {
  item: WatchItem;
  quote: WatchlistQuote | null;
  session: PaperTradingSession | null;
  isCreating: boolean;
  onStart: IntradayWatchTableProps["onStart"];
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  // sessionId "" 이면 쿼리 자동 비활성(useQueryPaperTradingSession enabled 가드) — 조건부 훅 회피.
  const { detail, isPatching, setStatus } = usePaperTradingSession(session?.id ?? "");
  const current = detail?.session ?? session;
  const position = detail?.positions.find((p) => p.quantity >= 1) ?? null;
  const lastTick = detail?.ticks.at(-1) ?? null;
  const running = current?.status === "running";

  return (
    <>
      <tr
        onClick={() => setExpanded((v) => !v)}
        className="cursor-pointer border-t border-border-line transition-colors hover:bg-surface-muted"
      >
        {/* 종목 — 코드 없이 이름만 + 세션 상태 뱃지 */}
        <td className="py-sm pl-lg pr-md">
          <div className="flex items-center gap-xs">
            <span className="text-body-sm-strong text-text-strong">{item.name}</span>
            {current ? (
              <span className="text-caption text-text-muted">{STATUS_LABEL[current.status]}</span>
            ) : null}
          </div>
        </td>
        <td className="py-sm pr-md text-right tabular-nums text-text-strong">
          {quote ? formatMoney(quote.price) : T.none}
        </td>
        <td className={cn("py-sm pr-md text-right tabular-nums", quote ? changeTone(quote.changePercent) : "text-text-muted")}>
          {quote ? formatPct(quote.changePercent) : T.none}
        </td>
        <td
          className={cn(
            "py-sm pr-md text-right tabular-nums text-body-sm-strong",
            current ? changeTone(current.returnPct) : "text-text-muted",
          )}
        >
          {current ? formatPct(current.returnPct) : T.none}
        </td>
        <td className="py-sm pr-md text-right tabular-nums text-text-strong">
          {current ? formatMoney(current.portfolioValue) : T.none}
        </td>
        <td className="py-sm pr-md text-right tabular-nums text-text-muted">
          {current ? (position ? `${position.quantity}주` : P.positionNone) : T.none}
        </td>
        <td className="py-sm pr-md text-text-muted">
          {lastTick ? (
            <span className="whitespace-nowrap">
              {ACTION_LABEL[lastTick.decision.action]}{" "}
              <span className="tabular-nums">{kstHhmm(lastTick.tickWindowStart)}</span>
            </span>
          ) : (
            T.none
          )}
        </td>
        <td className="py-sm pr-lg">
          <div className="flex items-center justify-end gap-xs">
            {current ? (
              <button
                type="button"
                className={ICON_BTN}
                disabled={isPatching}
                aria-label={running ? PAPER_TRADING_PAUSE : PAPER_TRADING_RESUME}
                onClick={(e) => {
                  e.stopPropagation();
                  void setStatus(running ? "paused" : "running");
                }}
              >
                {running ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
              </button>
            ) : null}
            <button
              type="button"
              className={ICON_BTN}
              aria-label={T.removeAria}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <X className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              className={ICON_BTN}
              aria-label={T.expandAria}
              aria-expanded={expanded}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
            >
              <ChevronDown
                className={cn("size-4 transition-transform", expanded && "rotate-180")}
                aria-hidden
              />
            </button>
          </div>
        </td>
      </tr>

      {expanded ? (
        <tr className="border-t border-border-line">
          <td colSpan={8} className="bg-surface-muted px-lg py-md">
            <ExpandedPanel
              item={item}
              session={current}
              isCreating={isCreating}
              onStart={onStart}
              onOpenSheet={() => setSheetOpen(true)}
            />
          </td>
        </tr>
      ) : null}

      {sheetOpen && current ? (
        <IntradayPaperDetailSheet
          session={current}
          stockName={item.name}
          onClose={() => setSheetOpen(false)}
        />
      ) : null}
    </>
  );
}

// ─── 확장 패널 — 장중 단타 판단 + AI 모의 단타 ────────────────────────────────

function ExpandedPanel({
  item,
  session,
  isCreating,
  onStart,
  onOpenSheet,
}: {
  item: WatchItem;
  session: PaperTradingSession | null;
  isCreating: boolean;
  onStart: IntradayWatchTableProps["onStart"];
  onOpenSheet: () => void;
}) {
  const { data: providers, isLoading: gateLoading } = useQueryAIProviders();
  const read = useMutationIntradayRead();
  const provider = providers?.available[0];

  const onRun = () => {
    if (provider) read.mutate({ ticker: item.ticker, provider });
  };

  return (
    <div className="flex flex-col gap-md">
      {/* 컨트롤 행 — 판단 받기 + 모의 단타(시작 폼 또는 체결 내역) */}
      <div className="flex flex-wrap items-center gap-md">
        <div className="flex items-center gap-xs">
          <span className="text-caption text-text-muted">{C.title}</span>
          {gateLoading ? null : !provider ? (
            <span className="text-caption text-text-muted">{C.localOnly}</span>
          ) : (
            <button
              type="button"
              className={cn("button-secondary", BTN_COMPACT)}
              onClick={onRun}
              disabled={read.isPending}
            >
              {read.isPending ? C.loading : read.data ? T.readRerun : T.readRun}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-xs">
          <span className="text-caption text-text-muted">{P.title}</span>
          {session ? (
            <>
              <button
                type="button"
                className={cn("button-secondary", BTN_COMPACT)}
                onClick={onOpenSheet}
              >
                {T.ordersButton}
              </button>
              <Link
                href={`/dashboard/paper-trading/${session.id}`}
                className={cn("button-secondary", BTN_COMPACT)}
              >
                {P.detailLink}
              </Link>
            </>
          ) : (
            <StartInlineForm item={item} isCreating={isCreating} onStart={onStart} />
          )}
        </div>
      </div>

      {/* 판단 결과 카드 */}
      {read.isError ? (
        <p className="text-caption text-signal-down">{read.error?.message ?? C.error}</p>
      ) : null}
      {read.isPending ? (
        <p className="text-caption text-text-muted">{C.loadingHint}</p>
      ) : null}
      {read.data ? <IntradayReadCard data={read.data} /> : null}

      <p className="text-caption text-text-muted">
        {C.disclaimer} {P.disclaimer}
      </p>
    </div>
  );
}

function StartInlineForm({
  item,
  isCreating,
  onStart,
}: {
  item: WatchItem;
  isCreating: boolean;
  onStart: IntradayWatchTableProps["onStart"];
}) {
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
      await onStart({ ticker: item.ticker, name: item.name }, amount);
    } catch (err) {
      setError(isApiError(err) ? err.message : P.error);
    }
  }

  return (
    <form className="flex flex-wrap items-center gap-xs" onSubmit={handleSubmit}>
      <label className="flex items-center gap-xs text-caption text-text-muted">
        <span>{P.cashLabel}</span>
        <input
          className="h-8 w-[9rem] rounded-md border border-border-line bg-surface-base px-sm text-body-sm text-text-strong tabular-nums"
          inputMode="numeric"
          value={cash}
          onChange={(event) => setCash(event.target.value)}
        />
      </label>
      <button type="submit" className={cn("button-primary", BTN_COMPACT)} disabled={isCreating}>
        {isCreating ? P.creating : P.startLabel}
      </button>
      {error ? (
        <span className="text-caption text-signal-down" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}
