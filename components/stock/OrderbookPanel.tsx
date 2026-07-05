/**
 * OrderbookPanel — 토스 호가창(매도 10 · 매수 10 단계) 공용 컴포넌트.
 *
 * PRD `toss-orderbook` §3-5 · DESIGN.md `toss-orderbook`. 자족 컴포넌트 — 내부에서
 * `useQueryStockOrderbook` 를 호출한다(지면은 배치·variant·enabled·폴링 주기만 결정).
 *
 * 렌더 방향(전형적 호가창):
 *   - 위: 매도(asks) — `signal-up`(빨강). 최저 매도호가가 중앙 밴드에 가장 가깝게(아래) 온다.
 *   - 중앙: 스프레드 밴드.
 *   - 아래: 매수(bids) — `signal-down`(파랑). 최고 매수호가가 중앙 밴드에 가장 가깝게(위) 온다.
 *   - 잔량 바는 매수·매도 **통합 max** 로 정규화(매도벽 vs 매수벽 대비, PRD q5). 매도 바는 우측·매수 바는
 *     좌측 정렬로 자란다. 바는 배경 장식(soft 토큰), 텍스트는 흰 배경 기준으로 읽힌다(AA 대비).
 *
 * 상태 3종: 로딩(스켈레톤 20줄) · 빈 호가(장마감/미지원) · 정상. never-throw 라 에러 UI 는 없다.
 */

"use client";

import { cn } from "@/lib/utils/cn";
import { useBreakpoint } from "@/hooks/utils/useBreakpoint";
import { useQueryStockOrderbook } from "@/hooks/stock/useQueryStockOrderbook";
import { useMarketStatus } from "@/hooks/market/useMarketStatus";
import { ORDERBOOK_COPY as C } from "@/lib/copy/stock/orderbook";
import type { Orderbook, OrderbookLevel } from "@/lib/types/stock/orderbook";

export interface OrderbookPanelProps {
  ticker: string;
  /** compact = /intraday 단타(밀도 최대) · full = /stock 종목상세(약간의 여백). 기본 full. */
  variant?: "compact" | "full";
  /** 지면 판단(선택 종목 없으면 false). 기본 true. */
  enabled?: boolean;
  className?: string;
}

/** 지면별 폴링 주기(ms) — 단타 촘촘·상세 느슨(PRD §9 q3). */
const REFETCH_MS = { compact: 3_000, full: 10_000 } as const;
/** 한 존당 표시 단계 수(토스는 정확히 10단계). */
const MAX_LEVELS = 10;

export function OrderbookPanel({
  ticker,
  variant = "full",
  enabled = true,
  className,
}: OrderbookPanelProps) {
  const { isMobile } = useBreakpoint();
  const { data, isLoading } = useQueryStockOrderbook(ticker, {
    enabled,
    refetchIntervalMs: REFETCH_MS[variant],
  });
  const compact = variant === "compact";
  const orderbook = data?.orderbook;

  return (
    <section
      className={cn(
        "flex flex-col gap-sm bg-surface",
        compact
          ? "rounded-lg border border-border-line p-md"
          : "rounded-lg p-card-px shadow-card",
        className,
      )}
      aria-label={C.title}
    >
      <header className="flex items-center justify-between">
        <h2
          className={cn(
            "text-text-strong",
            compact ? "text-label-sm" : "text-h2",
          )}
        >
          {C.title}
        </h2>
      </header>

      {isLoading && !orderbook ? (
        <OrderbookSkeleton compact={compact} />
      ) : !orderbook || orderbook.isEmpty ? (
        <OrderbookEmpty />
      ) : (
        <OrderbookBody orderbook={orderbook} compact={compact} isMobile={isMobile} />
      )}
    </section>
  );
}

// ─── 정상 호가 본문 ───────────────────────────────────────────────────────────

function OrderbookBody({
  orderbook,
  compact,
  isMobile,
}: {
  orderbook: Orderbook;
  compact: boolean;
  isMobile: boolean;
}) {
  const asks = orderbook.asks.slice(0, MAX_LEVELS);
  const bids = orderbook.bids.slice(0, MAX_LEVELS);
  // 매수·매도 통합 max 로 바 폭 정규화(벽 대비가 목적) — 잔량 없으면 1 로 나눠 0% 처리.
  const unifiedMax = Math.max(
    1,
    ...asks.map((l) => l.qty),
    ...bids.map((l) => l.qty),
  );

  return (
    <div className="flex flex-col">
      {/* 매도 — 최저 매도호가가 중앙 밴드에 가장 가깝도록 역순 렌더(높은 가격이 맨 위). */}
      <div className="flex flex-col">
        {[...asks].reverse().map((level, i) => (
          <OrderbookRow
            key={`ask-${i}`}
            level={level}
            side="ask"
            unifiedMax={unifiedMax}
            compact={compact}
            isMobile={isMobile}
          />
        ))}
      </div>

      <SpreadBand orderbook={orderbook} />

      {/* 매수 — 최고 매수호가가 중앙 밴드에 가장 가깝도록 그대로 렌더(높은 가격이 맨 위). */}
      <div className="flex flex-col">
        {bids.map((level, i) => (
          <OrderbookRow
            key={`bid-${i}`}
            level={level}
            side="bid"
            unifiedMax={unifiedMax}
            compact={compact}
            isMobile={isMobile}
          />
        ))}
      </div>

      <TotalFooter orderbook={orderbook} compact={compact} />
    </div>
  );
}

function OrderbookRow({
  level,
  side,
  unifiedMax,
  compact,
  isMobile,
}: {
  level: OrderbookLevel;
  side: "ask" | "bid";
  unifiedMax: number;
  compact: boolean;
  isMobile: boolean;
}) {
  const isAsk = side === "ask";
  const pct = Math.min(100, (level.qty / unifiedMax) * 100);
  return (
    <div
      className={cn(
        "flex items-center gap-sm",
        compact ? "h-orderbook-row-h-compact" : "h-orderbook-row-h",
      )}
    >
      {/* 좌열 — 잔량 비례 바(배경 장식) + 잔량 수치. */}
      <div className="relative flex h-full flex-1 items-center overflow-hidden">
        {level.qty > 0 ? (
          <div
            className={cn(
              "absolute inset-y-1 rounded-sm",
              isAsk ? "right-0 bg-signal-up-soft" : "left-0 bg-signal-down-soft",
            )}
            style={{ width: `${pct}%` }}
            aria-hidden
          />
        ) : null}
        <span className="relative ml-auto pr-sm text-caption tabular-nums text-text-muted">
          {formatQty(level.qty, isMobile)}
        </span>
      </div>
      {/* 우열 — 가격(매도 빨강 / 매수 파랑). */}
      <span
        className={cn(
          "shrink-0 text-right tabular-nums min-w-[4.5rem]",
          compact ? "text-caption" : "text-table-cell-numeric",
          isAsk ? "text-signal-up" : "text-signal-down",
        )}
      >
        {formatPrice(level.price)}
      </span>
    </div>
  );
}

// ─── 중앙 스프레드 밴드 ───────────────────────────────────────────────────────

function SpreadBand({ orderbook }: { orderbook: Orderbook }) {
  const hasSpread = orderbook.spread != null;
  return (
    <div className="my-xs flex items-center justify-center gap-sm rounded-sm bg-accent-soft px-sm py-sm">
      <span className="text-caption text-text-muted">{C.spread}</span>
      <span className="text-mono-numeric tabular-nums text-primary">
        {hasSpread
          ? `${formatPrice(orderbook.spread as number)}${
              orderbook.spreadPct != null
                ? ` (${orderbook.spreadPct.toFixed(2)}%)`
                : ""
            }`
          : C.dash}
      </span>
    </div>
  );
}

// ─── 총잔량 푸터 ──────────────────────────────────────────────────────────────

function TotalFooter({
  orderbook,
  compact,
}: {
  orderbook: Orderbook;
  compact: boolean;
}) {
  const { totalAskQty, totalBidQty } = orderbook;
  const totalMax = Math.max(1, totalAskQty, totalBidQty);
  return (
    <div className="mt-sm flex flex-col gap-xs">
      <div className="flex items-center gap-sm">
        <TotalChip label={C.totalAsk} qty={totalAskQty} tone="ask" />
        <TotalChip label={C.totalBid} qty={totalBidQty} tone="bid" />
      </div>
      {/* full — 매도:매수 비율 미니바(통합 정규화 색 동일). compact 은 숫자만. */}
      {!compact ? (
        <div className="flex h-orderbook-row-h-compact items-stretch gap-xs">
          <RatioBar qty={totalAskQty} max={totalMax} tone="ask" align="right" />
          <RatioBar qty={totalBidQty} max={totalMax} tone="bid" align="left" />
        </div>
      ) : null}
    </div>
  );
}

function TotalChip({
  label,
  qty,
  tone,
}: {
  label: string;
  qty: number;
  tone: "ask" | "bid";
}) {
  return (
    <div className="flex flex-1 items-center justify-between rounded-sm bg-surface-muted px-sm py-sm">
      <span className="text-caption text-text-muted">{label}</span>
      <span
        className={cn(
          "text-body-sm tabular-nums",
          tone === "ask" ? "text-signal-up" : "text-signal-down",
        )}
      >
        {formatQty(qty, false)}
      </span>
    </div>
  );
}

function RatioBar({
  qty,
  max,
  tone,
  align,
}: {
  qty: number;
  max: number;
  tone: "ask" | "bid";
  align: "left" | "right";
}) {
  const pct = Math.min(100, (qty / max) * 100);
  return (
    <div className="relative flex-1 overflow-hidden rounded-sm bg-surface-muted">
      <div
        className={cn(
          "absolute inset-y-0 rounded-sm",
          align === "right" ? "right-0" : "left-0",
          tone === "ask" ? "bg-signal-up-soft" : "bg-signal-down-soft",
        )}
        style={{ width: `${pct}%` }}
        aria-hidden
      />
    </div>
  );
}

// ─── 빈 호가 / 스켈레톤 ───────────────────────────────────────────────────────

function OrderbookEmpty() {
  // 장중 빈 응답은 "미지원", 장외는 "장 마감" 으로 안내(둘 다 동일 제목).
  // 폴링 게이트와 동일 기준(②의 `isRegularOpen`, 공휴일 인지·fail-open)으로 마감 표시가 어긋나지 않게.
  const closed = !useMarketStatus().isRegularOpen;
  return (
    <div className="flex flex-col items-center gap-xs py-lg text-center">
      <p className="text-body-sm text-text-strong">{C.emptyTitle}</p>
      <p className="text-caption text-text-muted">
        {closed ? C.emptyClosed : C.emptyUnsupported}
      </p>
    </div>
  );
}

function OrderbookSkeleton({ compact }: { compact: boolean }) {
  const rows = Array.from({ length: MAX_LEVELS * 2 });
  return (
    <div className="flex animate-pulse flex-col gap-xs" aria-hidden>
      {rows.map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-sm bg-surface-muted",
            compact ? "h-orderbook-row-h-compact" : "h-orderbook-row-h",
          )}
        />
      ))}
    </div>
  );
}

// ─── 포맷 ─────────────────────────────────────────────────────────────────────

/** 가격 — 천 단위 콤마(정수). */
function formatPrice(value: number): string {
  return Math.round(value).toLocaleString("ko-KR");
}

/** 잔량 — 모바일은 만/억 축약으로 폭 절약, 그 외는 콤마 정수. */
function formatQty(qty: number, abbrev: boolean): string {
  if (!Number.isFinite(qty) || qty <= 0) return "0";
  if (!abbrev) return Math.round(qty).toLocaleString("ko-KR");
  if (qty >= 100_000_000) return `${(qty / 100_000_000).toFixed(1)}억`;
  if (qty >= 10_000) return `${(qty / 10_000).toFixed(1)}만`;
  return Math.round(qty).toLocaleString("ko-KR");
}
