/**
 * IntradayWatchTable — 워치 종목 컴팩트 표 (토스 랭킹 표 스타일). intraday-paper-watch.
 *
 * 행 = 종목 | 현재가 | 등락률 | 모의 수익률 | 평가금액 | 포지션 | 최근 판단 | 모의 투자금(input)
 *      | 액션(판단·모의 시작·일시정지·제거·펼침 — 전부 컬럼 속성으로, 피드백 반영).
 * 종목 코드는 표시하지 않는다. 행 클릭(또는 펼침) → 판단 결과 카드·체결 내역 진입.
 * ⚠️ 의사결정 보조·가상 체결 — 자동 수익/집행 주장 없음.
 */

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, History, Pause, Play, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatKrwInput, formatMoney } from "@/lib/utils/formatMoney";
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
import {
  PAPER_TRADING_INTRADAY_INTERVAL_OPTIONS,
  type PaperTradingSelectedStock,
  type PaperTradingSession,
  type PaperTradingSessionDetail,
} from "@/lib/types/paperTrading/paperTrading";

/** 주기 드랍다운 기본값(분) — 초단타 기본. */
const DEFAULT_INTERVAL_MIN = 2;

const T = P.table;

/**
 * 컴팩트 버튼 — button-primary/secondary 합성 클래스는 높이·패딩 토큰이 달라 크기가 어긋나므로
 * (40px 고정 높이 등) 여기선 쓰지 않고 동일 스펙(h-8·px-sm·rounded-md·text-caption)으로 직접
 * 정의한다. 색만 다르고 크기는 픽셀 단위로 같다(디자인 일관성 피드백).
 */
const BTN_BASE =
  "inline-flex h-8 items-center justify-center rounded-md px-sm text-caption font-medium whitespace-nowrap transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default";
const BTN_PRIMARY = `${BTN_BASE} border-0 bg-accent-vivid text-surface hover:bg-accent-vivid/90`;
const BTN_NEUTRAL = `${BTN_BASE} border border-border-line bg-surface-base text-text-strong hover:bg-surface-muted`;
/** 틴트 필 버튼 — 테두리형(input·select 와 닮음) 대신 은은한 액센트 배경으로 '버튼'임을 구분. */
const BTN_TONAL = `${BTN_BASE} border-0 bg-accent-vivid/10 text-accent-vivid hover:bg-accent-vivid/20`;
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
    tickIntervalMinutes: number,
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
              {/* 여기부터 모의 투자 데이터 — 종목 정보와 세로 구분선으로 분리(피드백). */}
              <th className="border-l border-border-line py-sm pl-md pr-md text-right font-normal">
                {T.colReturn}
              </th>
              <th className="py-sm pr-md text-right font-normal">{T.colValue}</th>
              <th className="py-sm pr-md text-right font-normal">{T.colPosition}</th>
              <th className="py-sm pr-md text-left font-normal">{T.colLast}</th>
              <th className="py-sm pr-md text-right font-normal">{T.colCash}</th>
              <th className="py-sm pr-md text-center font-normal">{T.colInterval}</th>
              <th className="py-sm pr-md text-center font-normal">{T.colRead}</th>
              <th className="py-sm pr-md text-center font-normal">{T.colPaper}</th>
              <th className="py-sm pr-lg text-right font-normal" aria-label={T.colManage} />
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

// ─── 커스텀 드롭다운 공용 훅 ──────────────────────────────────────────────────

/**
 * 네이티브 select 는 팝업 방향(위로 뜸)·화살표 여백을 제어할 수 없어 커스텀으로 대체.
 * 메뉴는 position:fixed 로 띄워 표의 overflow 클리핑을 피하고 **항상 앵커 아래**에 연다.
 * 스크롤/리사이즈 시 닫는다(고정 좌표 어긋남 방지). 주기 셀렉트·금액 프리셋 공용.
 */
function useFixedMenu(rootRef: React.RefObject<HTMLDivElement | null>) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onMove() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, rootRef]);

  function toggle(anchor: HTMLElement | null) {
    if (!open && anchor) {
      const rect = anchor.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen((v) => !v);
  }

  return { open, pos, toggle, close: () => setOpen(false) };
}

function MenuPanel({
  pos,
  children,
}: {
  pos: { top: number; left: number; width: number };
  children: React.ReactNode;
}) {
  return (
    <div
      role="listbox"
      className="dropdown-panel z-50 overflow-hidden"
      style={{ position: "fixed", top: pos.top, left: pos.left, minWidth: pos.width }}
    >
      {children}
    </div>
  );
}

// ─── 주기 셀렉트 ──────────────────────────────────────────────────────────────

function IntervalSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const menu = useFixedMenu(rootRef);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div ref={rootRef} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={menu.open}
        aria-label={T.colInterval}
        className="inline-flex h-8 cursor-pointer items-center gap-xs rounded-md border border-border-line bg-surface-base pl-sm pr-xs text-body-sm text-text-strong tabular-nums transition-colors hover:bg-surface-muted"
        onClick={() => menu.toggle(buttonRef.current)}
      >
        {value}분
        <ChevronDown
          className={cn("size-4 text-text-muted transition-transform", menu.open && "rotate-180")}
          aria-hidden
        />
      </button>
      {menu.open && menu.pos ? (
        <MenuPanel pos={menu.pos}>
          {PAPER_TRADING_INTRADAY_INTERVAL_OPTIONS.map((min) => (
            <button
              key={min}
              type="button"
              role="option"
              aria-selected={min === value}
              className={cn(
                "block w-full cursor-pointer px-md py-xs text-left text-body-sm tabular-nums transition-colors hover:bg-surface-muted",
                min === value ? "font-medium text-accent-vivid" : "text-text-strong",
              )}
              onClick={() => {
                onChange(min);
                menu.close();
              }}
            >
              {min}분
            </button>
          ))}
        </MenuPanel>
      ) : null}
    </div>
  );
}

// ─── 금액 입력 (직접 입력 + 프리셋 드롭다운) ─────────────────────────────────

/** 모의 투자금 빠른 선택 프리셋(원). */
const CASH_PRESETS = [
  1_000_000, 3_000_000, 5_000_000, 10_000_000, 30_000_000, 50_000_000, 100_000_000,
] as const;

function presetLabel(amount: number): string {
  return amount >= 100_000_000
    ? `${(amount / 100_000_000).toLocaleString("ko-KR")}억원`
    : `${(amount / 10_000).toLocaleString("ko-KR")}만원`;
}

function CashInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const menu = useFixedMenu(rootRef);
  const boxRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={rootRef} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <div ref={boxRef} className="relative">
        <input
          className="h-8 w-[9rem] rounded-md border border-border-line bg-surface-base pl-sm pr-7 text-right text-body-sm text-text-strong tabular-nums"
          inputMode="numeric"
          value={value}
          aria-label={P.cashLabel}
          onChange={(e) => onChange(formatKrwInput(e.target.value))}
        />
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={menu.open}
          aria-label={T.cashPresetAria}
          className="absolute inset-y-0 right-0 flex w-7 cursor-pointer items-center justify-center text-text-muted transition-colors hover:text-text-strong"
          onClick={() => menu.toggle(boxRef.current)}
        >
          <ChevronDown
            className={cn("size-4 transition-transform", menu.open && "rotate-180")}
            aria-hidden
          />
        </button>
      </div>
      {menu.open && menu.pos ? (
        <MenuPanel pos={menu.pos}>
          {CASH_PRESETS.map((amount) => {
            const formatted = formatKrwInput(String(amount));
            const selected = value === formatted;
            return (
              <button
                key={amount}
                type="button"
                role="option"
                aria-selected={selected}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between gap-md px-md py-xs text-left text-body-sm transition-colors hover:bg-surface-muted",
                  selected ? "font-medium text-accent-vivid" : "text-text-strong",
                )}
                onClick={() => {
                  onChange(formatted);
                  menu.close();
                }}
              >
                <span>{presetLabel(amount)}</span>
                <span className="tabular-nums text-caption text-text-muted">{formatted}</span>
              </button>
            );
          })}
        </MenuPanel>
      ) : null}
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
  const [cash, setCash] = useState(formatKrwInput("10000000"));
  const [intervalMin, setIntervalMin] = useState(DEFAULT_INTERVAL_MIN);
  const [startError, setStartError] = useState<string | null>(null);

  // sessionId "" 이면 쿼리 자동 비활성(useQueryPaperTradingSession enabled 가드) — 조건부 훅 회피.
  const { detail, isPatching, setStatus } = usePaperTradingSession(session?.id ?? "");
  const { data: providers } = useQueryAIProviders();
  const read = useMutationIntradayRead();
  const provider = providers?.available[0];

  const current = detail?.session ?? session;
  const position = detail?.positions.find((p) => p.quantity >= 1) ?? null;
  const lastTick = detail?.ticks.at(-1) ?? null;
  const running = current?.status === "running";

  const runRead = () => {
    if (!provider || read.isPending) return;
    read.mutate({ ticker: item.ticker, provider });
    setExpanded(true);
  };

  async function handleStart() {
    const amount = Number(cash.replace(/[^0-9]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      setStartError(P.cashInvalid);
      setExpanded(true);
      return;
    }
    setStartError(null);
    try {
      await onStart({ ticker: item.ticker, name: item.name }, amount, intervalMin);
    } catch (err) {
      setStartError(isApiError(err) ? err.message : P.error);
      setExpanded(true);
    }
  }

  return (
    <>
      <tr
        onClick={() => setExpanded((v) => !v)}
        className="cursor-pointer border-t border-border-line transition-colors hover:bg-surface-muted"
      >
        {/* 종목 — 코드 없이 이름만 + 세션 상태 */}
        <td className="py-sm pl-lg pr-md">
          <div className="flex items-center gap-xs whitespace-nowrap">
            <span className="text-body-sm-strong text-text-strong">{item.name}</span>
            {current ? (
              <span className="text-caption text-text-muted">{STATUS_LABEL[current.status]}</span>
            ) : null}
          </div>
        </td>
        <td className="py-sm pr-md text-right tabular-nums text-text-strong">
          {quote ? formatMoney(quote.price) : T.none}
        </td>
        <td
          className={cn(
            "py-sm pr-md text-right tabular-nums",
            quote ? changeTone(quote.changePercent) : "text-text-muted",
          )}
        >
          {quote ? formatPct(quote.changePercent) : T.none}
        </td>
        <td
          className={cn(
            "border-l border-border-line py-sm pl-md pr-md text-right tabular-nums text-body-sm-strong",
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

        {/* 모의 투자금 — 미시작이면 input, 시작 후엔 시작 투자금 표시 */}
        <td className="py-sm pr-md text-right">
          {current ? (
            <span className="tabular-nums text-text-muted">{formatMoney(current.initialCash)}</span>
          ) : (
            <CashInput value={cash} onChange={setCash} />
          )}
        </td>

        {/* 판단 주기 — 미시작이면 드랍다운, 시작 후엔 세션 주기 표시 */}
        <td className="py-sm pr-md text-center">
          {current ? (
            <span className="tabular-nums text-text-muted">{current.tickIntervalMinutes}분</span>
          ) : (
            <IntervalSelect value={intervalMin} onChange={setIntervalMin} />
          )}
        </td>

        {/* AI 진단 — 매매 없이 지금 시점 판단만(결과는 펼침에) */}
        <td className="py-sm pr-md text-center">
          <button
            type="button"
            className={BTN_TONAL}
            disabled={!provider || read.isPending}
            title={T.readTitle}
            onClick={(e) => {
              e.stopPropagation();
              runRead();
            }}
          >
            {read.isPending ? T.readRunning : T.readRun}
          </button>
        </td>

        {/* 모의 매매 — 시작 또는 진행 중 컨트롤(체결 내역·일시정지) */}
        <td className="py-sm pr-md text-center">
          {current ? (
            <div className="inline-flex items-center gap-xs">
              <button
                type="button"
                className={ICON_BTN}
                aria-label={T.ordersButton}
                title={T.ordersButton}
                onClick={(e) => {
                  e.stopPropagation();
                  setSheetOpen(true);
                }}
              >
                <History className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                className={ICON_BTN}
                disabled={isPatching}
                aria-label={running ? PAPER_TRADING_PAUSE : PAPER_TRADING_RESUME}
                title={running ? PAPER_TRADING_PAUSE : PAPER_TRADING_RESUME}
                onClick={(e) => {
                  e.stopPropagation();
                  void setStatus(running ? "paused" : "running");
                }}
              >
                {running ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={BTN_PRIMARY}
              disabled={isCreating}
              onClick={(e) => {
                e.stopPropagation();
                void handleStart();
              }}
            >
              {isCreating ? P.creating : T.startRun}
            </button>
          )}
        </td>

        {/* 관리 — 제거 · 펼침 */}
        <td className="py-sm pr-lg">
          <div className="flex items-center justify-end gap-xs">
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

      {/* 펼침 — 판단 결과 카드 · 체결 내역 진입 · 안내 */}
      {expanded ? (
        <tr className="border-t border-border-line">
          <td colSpan={12} className="bg-surface-muted px-lg py-md">
            <div className="flex flex-col gap-sm">
              {startError ? (
                <p className="text-caption text-signal-down" role="alert">
                  {startError}
                </p>
              ) : null}
              {!provider ? <p className="text-caption text-text-muted">{C.localOnly}</p> : null}
              {read.isPending ? (
                <p className="text-caption text-text-muted">
                  {C.loading} {C.loadingHint}
                </p>
              ) : null}
              {read.isError ? (
                <p className="text-caption text-signal-down">{read.error?.message ?? C.error}</p>
              ) : null}
              {read.data ? <IntradayReadCard data={read.data} /> : null}
              {!startError && !read.isPending && !read.isError && !read.data && !current ? (
                <p className="text-caption text-text-muted">{T.expandEmpty}</p>
              ) : null}

              {current ? (
                <div className="flex flex-wrap items-center gap-xs">
                  <button type="button" className={BTN_NEUTRAL} onClick={() => setSheetOpen(true)}>
                    {T.ordersButton}
                  </button>
                  <Link href={`/dashboard/paper-trading/${current.id}`} className={BTN_NEUTRAL}>
                    {P.detailLink}
                  </Link>
                </div>
              ) : null}
            </div>
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
