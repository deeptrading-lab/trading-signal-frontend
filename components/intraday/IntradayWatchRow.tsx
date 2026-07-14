/**
 * IntradayWatchRow — 단타 워치 표의 종목 1행(+펼침 패널·시트) 및 행 전속 부품.
 *
 * `IntradayWatchTable.tsx`(1,200줄+)에서 분리(intraday-table-refactor):
 *   - **memo 행**: 30초 세션 invalidation·펼침 패널 3초 폴링이 표 전체를 재렌더하던 것을,
 *     props 가 안 바뀐 행은 스킵하게 한다(시세 갱신 시엔 quote 참조가 바뀌어 의도대로 재렌더).
 *     memo 가 유효하려면 부모가 인라인 클로저 props 를 만들지 않아야 한다 — `onRemove` 는
 *     `(ticker) => void` 시그니처로 부모 콜백을 그대로 받는다.
 *   - **펼침 아코디언(상위 소유)**: 행 내부 useState 였던 `expanded` 를 표 레벨
 *     `expandedTicker` 로 승격 — 동시 펼침을 1행으로 상한해 펼침 패널(호가·체결강도 각
 *     3초 폴링)의 N행 중첩 폴링을 구조적으로 차단한다(모바일 부하 완화, env 손잡이 없음).
 *
 * 전속 부품(다른 소비처 0): OwnerBadge · useFixedMenu/MenuPanel · IntervalSelect ·
 * HardStopSelect · CashInput · 컴팩트 버튼 상수 · 포맷 헬퍼.
 */

"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronDown, ExternalLink, History, Loader2, Pause, Play, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatKrwInput, formatMoney } from "@/lib/utils/formatMoney";
import { isApiError } from "@/lib/api/errors";
import { useQueryAIProviders } from "@/hooks/stock/useQueryAIProviders";
import { useMutationIntradayRead } from "@/hooks/stock/useMutationIntradayRead";
import { usePaperTradingSession } from "@/hooks/paperTrading/usePaperTradingSession";
import { IntradayReadCard } from "@/components/stock/IntradayReadCard";
import { IntradayPaperDetailSheet } from "@/components/intraday/IntradayPaperDetailSheet";
import { StockWarningBadges } from "@/components/stock/StockWarningBadges";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { isPaperSessionStalled } from "@/lib/utils/paperTradingStale";
import {
  INTRADAY_AUTOPILOT_COPY as A,
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
  INTRADAY_TIMEFRAME_BY_INTERVAL,
  PAPER_TRADING_INTRADAY_INTERVAL_OPTIONS,
  type PaperTradingSelectedStock,
  type PaperTradingSession,
  type PaperTradingSessionDetail,
  type PaperTradingSessionStatus,
} from "@/lib/types/paperTrading/paperTrading";
import { OrderbookPanel } from "@/components/stock/OrderbookPanel";
import { TradeStrengthPanel } from "@/components/stock/TradeStrengthPanel";
import type { StockWarningItem } from "@/lib/types/stock/warnings";
import type { WatchItem } from "@/components/intraday/IntradayWatchTable";

/**
 * 분봉 미니차트 — recharts(~100KB gz)를 끌어오는 유일한 표 내 컴포넌트라 지연 로드
 * (mobile-perf-bundle, `peekDynamic.ts` 정합). 행 펼침 시에만 마운트되므로 /intraday 진입
 * 번들에서 recharts 가 빠지고, 첫 펼침 1회만 스켈레톤(차트 실높이 220px 미러)이 잠깐 보인다.
 */
const IntradayMiniChart = dynamic(
  () =>
    import("@/components/intraday/IntradayMiniChart").then(
      (m) => m.IntradayMiniChart,
    ),
  {
    ssr: false,
    loading: () => <Skeleton variant="block" className="h-[220px] w-full" />,
  },
);

/**
 * 주기 드랍다운 기본값(분) — 5분 = 캘리브레이션 표준(PRD intraday-decision-overhaul §10-4).
 * 2분(1분봉)은 노이즈 최대 + LLM 체인(최악 ~75s) 지연과 부정합이라 기본에서 제외 —
 * 드롭다운에서 여전히 선택 가능(실험용).
 */
const DEFAULT_INTERVAL_MIN = 5;

const T = P.table;

/** 펼침 시 행 진입 애니(페이드+살짝 아래로 슬라이드). 마운트 시 1회 — 폴링 리렌더엔 재발화 안 함. */
export const ROW_ENTER = {
  initial: { opacity: 0, y: -4 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.18, ease: [0.2, 0, 0, 1] as const },
} as const;

/**
 * 컴팩트 버튼 — button-primary/secondary 합성 클래스는 높이·패딩 토큰이 달라 크기가 어긋나므로
 * (40px 고정 높이 등) 여기선 쓰지 않고 동일 스펙(h-7·px-sm·rounded-md·text-caption)으로 직접
 * 정의한다. 색만 다르고 크기는 픽셀 단위로 같다(디자인 일관성 피드백).
 */
const BTN_BASE =
  "inline-flex h-7 items-center justify-center rounded-md px-sm text-caption font-medium whitespace-nowrap transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default";
const BTN_PRIMARY = `${BTN_BASE} border-0 bg-accent-vivid text-surface hover:bg-accent-vivid/90`;
/** 틴트 필 버튼 — 테두리형(input·select 와 닮음) 대신 은은한 액센트 배경으로 '버튼'임을 구분. */
const BTN_TONAL = `${BTN_BASE} border-0 bg-accent-vivid/10 text-accent-vivid hover:bg-accent-vivid/20`;
const ICON_BTN =
  "inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-base hover:text-text-strong cursor-pointer disabled:opacity-40";

// ─── 커스텀 드롭다운 공용 훅 ──────────────────────────────────────────────────

/**
 * 네이티브 select 는 팝업 방향(위로 뜸)·화살표 여백을 제어할 수 없어 커스텀으로 대체.
 * 메뉴는 position:fixed 로 띄워 표의 overflow 클리핑을 피하고 **항상 앵커 아래**에 연다.
 * 스크롤/리사이즈 시 닫는다(고정 좌표 어긋남 방지). 주기 셀렉트·금액 프리셋 공용.
 */
function useFixedMenu(rootRef: React.RefObject<HTMLDivElement | null>) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
    anchorTop: number;
  } | null>(null);

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
      setPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        anchorTop: rect.top,
      });
    }
    setOpen((v) => !v);
  }

  return { open, pos, toggle, close: () => setOpen(false) };
}

function MenuPanel({
  pos,
  children,
}: {
  pos: { top: number; left: number; width: number; anchorTop: number };
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(pos.top);
  // 아래로 넘치고(뷰포트 하단 초과) 위 공간이 충분하면 앵커 위로 플립(사용자 지적: 하단 옵션 잘림).
  useLayoutEffect(() => {
    const h = ref.current?.offsetHeight ?? 0;
    const overflowsBelow = pos.top + h > window.innerHeight - 8;
    const flippedTop = pos.anchorTop - h - 4;
    setTop(overflowsBelow && flippedTop > 8 ? flippedTop : pos.top);
  }, [pos]);
  return (
    <div
      ref={ref}
      role="listbox"
      className="dropdown-panel z-50 overflow-hidden"
      style={{ position: "fixed", top, left: pos.left, minWidth: pos.width }}
    >
      {children}
    </div>
  );
}

// ─── 주기 셀렉트 ──────────────────────────────────────────────────────────────

function IntervalSelect({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const menu = useFixedMenu(rootRef);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      ref={rootRef}
      className="relative inline-block"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={menu.open}
        aria-label={T.colInterval}
        disabled={disabled}
        className="inline-flex h-7 cursor-pointer items-center gap-xs rounded-md border border-border-line bg-surface-base pl-sm pr-xs text-caption text-text-strong tabular-nums transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
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

// ─── 손절 상한(포지션 하드스톱) 셀렉트 ────────────────────────────────────────

/** 손절 상한 선택지(%) — null=끄기. 급락 시 자동 전량 청산 백스톱(intraday-stop-slippage C). */
const HARD_STOP_OPTIONS: Array<{ value: number | null; label: string; hint: string }> = [
  { value: -3, label: "−3%", hint: T.hardStopConservative },
  { value: -5, label: "−5%", hint: T.hardStopStandard },
  { value: -8, label: "−8%", hint: T.hardStopAggressive },
  { value: null, label: T.hardStopOff, hint: "" },
];

/** 손절 상한 라벨(음수 % → "−N%") — 세션 표시·버튼 공용. */
function hardStopLabel(value: number): string {
  return `−${Math.abs(value)}%`;
}

/** 진행/완료 세션의 하드스톱 표시값 — null=끄기, 미기록(레거시)=riskMode 기본(−3/−5/−8). */
function sessionHardStopLabel(session: PaperTradingSession): string {
  const value = session.positionHardStopPct;
  if (value === null) return T.hardStopOff;
  if (value === undefined) {
    const fallback =
      session.riskMode === "conservative" ? -3 : session.riskMode === "aggressive" ? -8 : -5;
    return hardStopLabel(fallback);
  }
  return hardStopLabel(value);
}

function HardStopSelect({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const menu = useFixedMenu(rootRef);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isOff = value === null;

  return (
    <div
      ref={rootRef}
      className="relative inline-block"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={menu.open}
        aria-label={T.colHardStop}
        title={isOff ? T.hardStopOffWarnTitle : T.hardStopTitle}
        className={cn(
          "inline-flex h-7 cursor-pointer items-center gap-xs rounded-md border bg-surface-base pl-sm pr-xs text-caption tabular-nums transition-colors hover:bg-surface-muted",
          isOff ? "border-signal-down/40 text-signal-down" : "border-border-line text-text-strong",
        )}
        onClick={() => menu.toggle(buttonRef.current)}
      >
        {isOff ? T.hardStopOff : hardStopLabel(value)}
        <ChevronDown
          className={cn("size-4 text-text-muted transition-transform", menu.open && "rotate-180")}
          aria-hidden
        />
      </button>
      {menu.open && menu.pos ? (
        <MenuPanel pos={menu.pos}>
          {HARD_STOP_OPTIONS.map((opt) => {
            const selected = opt.value === value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                role="option"
                aria-selected={selected}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between gap-md px-md py-xs text-left text-body-sm tabular-nums transition-colors hover:bg-surface-muted",
                  selected
                    ? "font-medium text-accent-vivid"
                    : opt.value === null
                      ? "text-signal-down"
                      : "text-text-strong",
                )}
                onClick={() => {
                  onChange(opt.value);
                  menu.close();
                }}
              >
                <span>{opt.label}</span>
                {opt.hint ? <span className="text-caption text-text-muted">{opt.hint}</span> : null}
              </button>
            );
          })}
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
    <div
      ref={rootRef}
      className="relative inline-block"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div ref={boxRef} className="relative">
        <input
          className="h-7 w-[9rem] rounded-md border border-border-line bg-surface-base pl-sm pr-7 text-right text-caption text-text-strong tabular-nums"
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

/** 세션 소유자 배지 — 내 서버 세션은 "나"(accent), 다른 서버 세션은 운영자 라벨(muted). 미지정/무세션·구 응답이면 미표시. */
function OwnerBadge({
  owner,
  currentOperator,
}: {
  owner: string | undefined;
  currentOperator?: string;
}) {
  if (!owner) return null;
  if (currentOperator && owner === currentOperator) {
    return (
      <span
        title={P.owner.mineTitle}
        className="rounded-pill bg-accent-soft px-xs text-caption font-medium text-accent-vivid"
      >
        {P.owner.mine}
      </span>
    );
  }
  return (
    <span
      title={P.owner.otherTitle(owner)}
      className="inline-block max-w-[6rem] truncate rounded-pill bg-surface-muted px-xs text-caption text-text-muted"
    >
      {owner}
    </span>
  );
}

/**
 * 세션 상태 필 — 색+모양+텍스트 삼중 부호(색약 안전). 실행 중=녹색 필+맥박 점(장중 배지
 * `market-badge-open` 과 같은 문법), 판단 끊김=앰버 경고, 일시정지=회색 필+정지 아이콘(의도된
 * 정지), 완료=테두리만 남긴 조용한 필, 실패=critical. 상태 클래스는 조건부 리터럴
 * (속성 선택자 + `@apply` Turbopack 누락 함정 회피).
 */
const STATUS_PILL_BASE =
  "inline-flex items-center gap-xs rounded-pill px-sm text-caption font-medium whitespace-nowrap";

function StatusPill({
  status,
  stalled,
}: {
  status: PaperTradingSessionStatus;
  stalled: boolean;
}) {
  if (stalled) {
    return (
      <span title={P.stalledHint} className={cn(STATUS_PILL_BASE, "bg-warn-soft text-warn")}>
        <span className="h-sm w-sm rounded-pill bg-current" aria-hidden />
        {P.stalled}
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className={cn(STATUS_PILL_BASE, "bg-market-open-soft text-market-open")}>
        <span
          className="h-sm w-sm rounded-pill bg-current motion-safe:animate-pulse"
          aria-hidden
        />
        {STATUS_LABEL.running}
      </span>
    );
  }
  if (status === "paused") {
    return (
      <span
        className={cn(
          STATUS_PILL_BASE,
          "border border-border-line bg-surface-muted text-text-muted",
        )}
      >
        <Pause className="size-3" aria-hidden />
        {STATUS_LABEL.paused}
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className={cn(STATUS_PILL_BASE, "bg-critical-soft text-critical")}>
        {STATUS_LABEL.failed}
      </span>
    );
  }
  return (
    <span className={cn(STATUS_PILL_BASE, "border border-border-line text-text-muted")}>
      {STATUS_LABEL.completed}
    </span>
  );
}

/**
 * 행 좌측 상태 스트라이프 색 — 필과 같은 매핑을 주변시로도 잡히게 세로 바로 반복.
 * 실행=녹색·판단 끊김=앰버·일시정지=희미한 회색, 완료/실패/무세션=없음(null).
 */
function stripeColor(
  status: PaperTradingSessionStatus | undefined,
  stalled: boolean,
): string | null {
  if (!status) return null;
  if (stalled) return "bg-warn";
  if (status === "running") return "bg-market-open";
  if (status === "paused") return "bg-border-line";
  return null;
}

/** 좌측 상태 스트라이프 — 첫 셀(relative) 안 absolute 세로 바. 펼침 행에도 같은 색으로 이어 붙인다. */
function StatusStripe({ color }: { color: string | null }) {
  if (!color) return null;
  return (
    <span
      className={cn("absolute inset-y-xs left-0 w-xs rounded-r-pill", color)}
      aria-hidden
    />
  );
}

export interface IntradayWatchRowProps {
  item: WatchItem;
  quote: WatchlistQuote | null;
  quotesLoading: boolean;
  session: PaperTradingSession | null;
  warnings: StockWarningItem[] | undefined;
  currentOperator?: string;
  selected?: boolean;
  /**
   * 펼침(아코디언) — 표가 `expandedTicker` 단일 상태로 소유. 동시 펼침 1행 상한이라 펼침
   * 패널의 3초 폴링(호가+체결강도)이 최대 2본을 넘지 않는다(intraday-table-refactor).
   */
  expanded: boolean;
  /** 펼침 변경 요청 — (ticker, 원하는 상태). 표의 안정 콜백(useCallback)이라 memo 를 깨지 않는다. */
  onExpandChange: (ticker: string, expanded: boolean) => void;
  onSelect?: (ticker: string) => void;
  onStart: (
    stock: PaperTradingSelectedStock,
    initialCash: number,
    tickIntervalMinutes: number,
    positionHardStopPct: number | null,
  ) => Promise<PaperTradingSessionDetail>;
  /** 워치 행 제거 — 부모 콜백 그대로(인라인 클로저 금지 = memo 유효화). */
  onRemove: (ticker: string) => void;
}

function WatchRow({
  item,
  quote,
  quotesLoading,
  session,
  warnings,
  currentOperator,
  selected,
  expanded,
  onExpandChange,
  onSelect,
  onStart,
  onRemove,
}: IntradayWatchRowProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cash, setCash] = useState(formatKrwInput("10000000"));
  const [intervalMin, setIntervalMin] = useState(DEFAULT_INTERVAL_MIN);
  // 손절 상한(포지션 하드스톱) — 기본 −5%(표준). null=끄기(급락 무제한 리스크 경고 동반).
  const [hardStopPct, setHardStopPct] = useState<number | null>(-5);
  const [startError, setStartError] = useState<string | null>(null);
  // 세션 생성 중 표시·disabled 모두 **이 행 한정**(starting). 전역 isCreating 은 다른 종목 시작까지
  // 막던 버그라 제거 — 세션은 종목당 1개·병렬 허용이므로 각 행은 자기 생성 중에만 잠긴다(사용자 지적).
  const [starting, setStarting] = useState(false);
  // 펼침 탭 — 체결 내역(판단 메모 포함) 기본, 차트(당일 분봉+체결 마커) 전환(사용자 지정 순서).
  // 부수 효과: recharts 지연 로드가 차트 탭 첫 진입까지 미뤄져 펼침 기본 경로가 더 가볍다.
  const [tab, setTab] = useState<"chart" | "orders">("orders");

  // sessionId "" 이면 쿼리 자동 비활성(useQueryPaperTradingSession enabled 가드) — 조건부 훅 회피.
  const { detail, isPatching, setStatus, setInterval } = usePaperTradingSession(session?.id ?? "");
  const { data: providers } = useQueryAIProviders();
  const read = useMutationIntradayRead();
  const provider = providers?.available[0];

  const current = detail?.session ?? session;
  const position = detail?.positions.find((p) => p.quantity >= 1) ?? null;
  const lastTick = detail?.ticks.at(-1) ?? null;
  const running = current?.status === "running";
  // 장중인데 자동 판단이 끊긴 running 세션 = "판단 끊김"(스케줄러 hang). refresh 폴링 재렌더마다 재평가.
  const stalled = current ? isPaperSessionStalled(current) : false;
  // 좌측 상태 스트라이프 + 일시정지 절충 디밍(intraday-session-status) — 색이 살아있는 행 =
  // 지금 돌고 있는 세션. 완료 세션은 당일 성과 비교 대상이라 디밍하지 않는다.
  const stripe = stripeColor(current?.status, stalled);
  const dimmed = current?.status === "paused";
  // 체결 전체(시간순) — 차트 탭 마커용. 미니 로그는 최근 5건(최신 위), 전체·손익 합계는 시트.
  // rationale 은 틱 레벨 판단 메모 — 체결별 "왜 샀/팔았나"를 미니 로그 우측에 보여준다.
  const allOrders = (detail?.ticks ?? []).flatMap((tick) =>
    tick.orders.map((order) => ({
      ...order,
      at: tick.tickWindowStart,
      rationale: tick.rationale,
    })),
  );
  const recentOrders = allOrders.slice(-5).reverse();
  // 차트 분봉 단위 — 세션 주기에서 파생(세션 없으면 드랍다운 선택값 기준).
  const chartTimeframe =
    INTRADAY_TIMEFRAME_BY_INTERVAL[current?.tickIntervalMinutes ?? intervalMin] ?? 1;

  const runRead = () => {
    if (!provider || read.isPending) return;
    read.mutate({ ticker: item.ticker, provider });
    onExpandChange(item.ticker, true);
  };

  async function handleStart() {
    const amount = Number(cash.replace(/[^0-9]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      setStartError(P.cashInvalid);
      onExpandChange(item.ticker, true);
      return;
    }
    setStartError(null);
    setStarting(true);
    try {
      await onStart({ ticker: item.ticker, name: item.name }, amount, intervalMin, hardStopPct);
    } catch (err) {
      setStartError(isApiError(err) ? err.message : P.error);
      onExpandChange(item.ticker, true);
    } finally {
      setStarting(false);
    }
  }

  return (
    <>
      <motion.tr
        {...ROW_ENTER}
        onClick={() => {
          onSelect?.(item.ticker);
          onExpandChange(item.ticker, !expanded);
        }}
        className={cn(
          "cursor-pointer border-t border-border-line transition-colors hover:bg-surface-muted",
          selected && "bg-accent-soft",
        )}
      >
        {/* 종목 — 코드 없이 이름만 + 매수 유의 칩 + 세션 상태 필(+좌측 스트라이프) */}
        <td className="relative py-sm pl-lg pr-md">
          <StatusStripe color={stripe} />
          <div className="flex items-center gap-xs whitespace-nowrap">
            <span
              className={cn(
                "text-body-sm-strong",
                dimmed ? "text-text-muted" : "text-text-strong",
              )}
            >
              {item.name}
            </span>
            <StockWarningBadges warnings={warnings} max={1} size="sm" />
            <OwnerBadge owner={current?.owner} currentOperator={currentOperator} />
            {/* 오토파일럿 자식 세션 — 자동 편입 종목 구분(intraday-autopilot). */}
            {current?.autopilotRunId ? (
              <Badge variant="accent" title={A.rowBadgeTitle}>
                {A.rowBadge}
              </Badge>
            ) : null}
            {current ? <StatusPill status={current.status} stalled={stalled} /> : null}
          </div>
        </td>
        <td
          className={cn(
            "py-sm pr-md text-right tabular-nums",
            dimmed ? "text-text-muted" : "text-text-strong",
          )}
        >
          {quote ? (
            formatMoney(quote.price)
          ) : quotesLoading ? (
            <Skeleton variant="line" className="ml-auto mb-0 w-16" />
          ) : (
            T.none
          )}
        </td>
        <td
          className={cn(
            "py-sm pr-md text-right tabular-nums",
            quote && !dimmed ? changeTone(quote.changePercent) : "text-text-muted",
          )}
        >
          {quote ? (
            formatPct(quote.changePercent)
          ) : quotesLoading ? (
            <Skeleton variant="line" className="ml-auto mb-0 w-12" />
          ) : (
            T.none
          )}
        </td>
        <td
          className={cn(
            "border-l border-border-line py-sm pl-md pr-md text-right tabular-nums text-body-sm-strong",
            current && !dimmed ? changeTone(current.returnPct) : "text-text-muted",
          )}
        >
          {current ? formatPct(current.returnPct) : T.none}
        </td>
        <td
          className={cn(
            "py-sm pr-md text-right tabular-nums",
            dimmed ? "text-text-muted" : "text-text-strong",
          )}
        >
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

        {/* 판단 주기 — 미시작=드랍다운(시작값) / 진행·일시정지=드랍다운(세션 중 변경, 다음 틱부터 반영)
            / 완료=정적 텍스트. 변경 중(isPatching)엔 비활성. */}
        <td className="py-sm pr-md text-center">
          {current ? (
            current.status === "completed" ? (
              <span className="tabular-nums text-text-muted">{current.tickIntervalMinutes}분</span>
            ) : (
              <IntervalSelect
                value={current.tickIntervalMinutes}
                onChange={(v) => void setInterval(v)}
                disabled={isPatching}
              />
            )
          ) : (
            <IntervalSelect value={intervalMin} onChange={setIntervalMin} />
          )}
        </td>

        {/* 손절 상한(포지션 하드스톱) — 미시작=셀렉트(끄기 시 경고), 진행/완료=설정값 정적 표시 */}
        <td className="py-sm pr-md text-center">
          {current ? (
            <span
              className={cn(
                "tabular-nums",
                current.positionHardStopPct === null ? "text-signal-down" : "text-text-muted",
              )}
            >
              {sessionHardStopLabel(current)}
            </span>
          ) : (
            <div className="inline-flex flex-col items-center gap-xs">
              <HardStopSelect value={hardStopPct} onChange={setHardStopPct} />
              {hardStopPct === null ? (
                <span className="text-caption text-signal-down" title={T.hardStopOffWarnTitle}>
                  {T.hardStopOffWarn}
                </span>
              ) : null}
            </div>
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
            onKeyDown={(e) => e.stopPropagation()}
          >
            {read.isPending ? (
              <>
                <Loader2 className="mr-xs size-4 animate-spin" aria-hidden />
                {T.readRunning}
              </>
            ) : (
              T.readRun
            )}
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
                onKeyDown={(e) => e.stopPropagation()}
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
                onKeyDown={(e) => e.stopPropagation()}
              >
                {running ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={BTN_PRIMARY}
              disabled={starting}
              onClick={(e) => {
                e.stopPropagation();
                void handleStart();
              }}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {starting ? (
                <>
                  <Loader2 className="mr-xs size-4 animate-spin" aria-hidden />
                  {P.creating}
                </>
              ) : (
                T.startRun
              )}
            </button>
          )}
        </td>

        {/* 관리 — 전체 화면(세션 시) · 제거 · 펼침 */}
        <td className="py-sm pr-lg">
          <div className="flex items-center justify-end gap-xs">
            {current ? (
              <Link
                href={`/intraday/${current.id}`}
                className={ICON_BTN}
                aria-label={P.detailLink}
                title={P.detailLink}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <ExternalLink className="size-4" aria-hidden />
              </Link>
            ) : null}
            {/* 세션 행은 상태와 무관하게 DB 기준으로 항상 상주(단일 소스 — 모의투자 목록 동등) → ✕ 없음.
                세션이 아직 없는 워치 행(검색으로 추가)만 ✕ 로 뺄 수 있다. */}
            {!current ? (
              <button
                type="button"
                className={ICON_BTN}
                aria-label={T.removeAria}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item.ticker);
                }}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
            <button
              type="button"
              className={ICON_BTN}
              aria-label={T.expandAria}
              aria-expanded={expanded}
              onClick={(e) => {
                e.stopPropagation();
                onExpandChange(item.ticker, !expanded);
              }}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <ChevronDown
                className={cn("size-4 transition-transform", expanded && "rotate-180")}
                aria-hidden
              />
            </button>
          </div>
        </td>
      </motion.tr>

      {/* 펼침 — 판단 결과 카드 · 체결 내역 진입 · 안내. 스트라이프를 이어 붙여 어느 세션의 펼침인지 표시. */}
      {expanded ? (
        <tr className="border-t border-border-line">
          <td colSpan={13} className="relative bg-surface-muted px-lg py-md">
            <StatusStripe color={stripe} />
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

              {/* 왜 이런 판단 — 최근 판단 근거 메모(탭 공통 상단) */}
              {current && lastTick ? (
                <p className="text-caption text-text-muted">
                  {P.lastDecision}: {lastTick.rationale}
                </p>
              ) : null}

              {/* 펼침 탭 — 체결 내역 | 차트 (체결 내역 기본, 사용자 지정 순서) */}
              <div className="flex items-center gap-md border-b border-border-line" role="tablist">
                {(["orders", "chart"] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={tab === key}
                    className={cn(
                      "-mb-px cursor-pointer border-b-2 pb-xs text-body-sm transition-colors",
                      tab === key
                        ? "border-accent-vivid font-medium text-text-strong"
                        : "border-transparent text-text-muted hover:text-text-strong",
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      setTab(key);
                    }}
                  >
                    {key === "chart" ? T.tabChart : T.tabOrders}
                  </button>
                ))}
              </div>

              {tab === "chart" ? (
                <div className="flex flex-col gap-md">
                  <IntradayMiniChart
                    ticker={item.ticker}
                    timeframe={chartTimeframe}
                    orders={allOrders.map((order) => ({
                      at: order.at,
                      price: order.price,
                      side: order.side,
                    }))}
                  />
                  {/* 차트 밑 — 호가창(좌) + 체결강도(우). 종목 펼침 시에만 렌더돼 폴링도 그때만(사용자 배치).
                      아코디언(동시 펼침 1행)이라 이 3초 폴링 쌍은 전체 표에서 최대 1쌍. */}
                  <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
                    <OrderbookPanel ticker={item.ticker} variant="compact" />
                    <TradeStrengthPanel ticker={item.ticker} variant="compact" />
                  </div>
                </div>
              ) : !current ? (
                <p className="text-caption text-text-muted">{T.ordersNoSession}</p>
              ) : (
                <div className="flex flex-col gap-xs">
                  {/* 미니 체결 로그 — 최근 5건(전체·손익 합계는 행의 체결 내역 아이콘) */}
                  {recentOrders.length === 0 ? (
                    <p className="text-body-sm text-text-muted">{P.sheet.ordersEmpty}</p>
                  ) : (
                    // 보이지 않는 그리드 정렬 — ul 이 5트랙(시각·구분·수량×가격·손익·메모)을 소유하고
                    // 각 li 가 subgrid 로 트랙을 공유해, 행마다 팩트 폭이 달라도 컬럼이 딱 맞는다.
                    // 손익 셀은 null 이어도 자리를 차지(빈 span)해 메모 트랙이 밀리지 않는다.
                    <ul className="grid grid-cols-[auto_auto_auto_auto_1fr] gap-x-md gap-y-xs text-body-sm tabular-nums">
                      {recentOrders.map((order, index) => (
                        <li
                          key={`${order.at}-${index}`}
                          className="col-span-full grid grid-cols-subgrid items-baseline"
                        >
                          <span className="whitespace-nowrap text-text-muted">
                            {kstHhmm(order.at)}
                          </span>
                          <span
                            className={cn(
                              "whitespace-nowrap font-medium",
                              order.side === "BUY" ? "text-signal-up" : "text-signal-down",
                            )}
                          >
                            {order.side === "BUY" ? P.sheet.sideBuy : P.sheet.sideSell}
                          </span>
                          <span className="whitespace-nowrap text-text-strong">
                            {order.quantity}주 × {formatMoney(order.price)}
                          </span>
                          <span
                            className={cn(
                              "whitespace-nowrap",
                              order.realizedPnl != null &&
                                (order.realizedPnl >= 0 ? "text-signal-up" : "text-signal-down"),
                            )}
                          >
                            {order.realizedPnl != null ? (
                              <>
                                {order.realizedPnl >= 0 ? "+" : ""}
                                {formatMoney(order.realizedPnl)}
                              </>
                            ) : null}
                          </span>
                          {/* 판단 메모 — 최대 2줄 말줄임(hover 전문). 모바일은 팩트 아래 전폭 랩. */}
                          {order.rationale ? (
                            <span
                              className="col-span-full min-w-0 text-caption leading-snug text-text-muted line-clamp-2 sm:col-span-1 sm:col-start-5"
                              title={order.rationale}
                            >
                              {order.rationale}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
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

/**
 * memo 행 — 30초 세션 invalidation·아코디언 전환 시 props 무변경 행의 재렌더를 스킵.
 * 유효 조건: 부모가 인라인 클로저 props 를 만들지 않는다(onRemove/onExpandChange 는 안정 콜백,
 * quote/session/warnings 는 소스 배열·맵이 안 바뀌면 참조 동일).
 */
export const IntradayWatchRow = memo(WatchRow);
