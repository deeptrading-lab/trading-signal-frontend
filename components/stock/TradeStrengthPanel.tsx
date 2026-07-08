/**
 * TradeStrengthPanel — 토스 체결강도(틱룰 파생) 게이지 + 체결 테이프 공용 컴포넌트.
 *
 * PRD `toss-trades` §3-6 · DESIGN.md `toss-trades`. 자족 컴포넌트 — 내부에서 `useQueryStockTrades`
 * 를 호출한다(지면은 배치·variant·enabled·폴링 주기만 결정). `OrderbookPanel` 과 같은 지면에 나란히
 * 놓이므로 카드/여백/행 높이 토큰을 그대로 맞춘다.
 *
 * ## ★ 색 매핑 — OrderbookPanel 과 의도적으로 반대 (DESIGN R1)
 *
 *   - 매수 체결 / 상승틱 = `signal-up`(빨강) · `signal-up-soft`
 *   - 매도 체결 / 하락틱 = `signal-down`(파랑) · `signal-down-soft`
 *
 * 테이프 행은 상승틱=빨강(앱 캔들 관례)으로 고정 → 상승틱=매수라 매수는 이미 빨강 → 게이지 매수
 * 세그먼트도 빨강이어야 한 컴포넌트 안에서 색이 일치한다. 색 단독 의존 금지 — 게이지는 항상 "매수 n% ·
 * 매도 m%" 글자를, 근사는 "추정치" 칩을 병기한다(접근성·정직성).
 *
 * 상태 4종: 로딩(스켈레톤) · 빈 체결(장마감/미지원) · 강도 불명(중립 게이지 + 정상 테이프) · 정상.
 * never-throw 라 에러 UI 는 없다(fail-soft → 빈 체결 카피 흡수).
 */

"use client";

import { cn } from "@/lib/utils/cn";
import { useBreakpoint } from "@/hooks/utils/useBreakpoint";
import { useQueryStockTrades } from "@/hooks/stock/useQueryStockTrades";
import { useMarketStatus } from "@/hooks/market/useMarketStatus";
import { TRADES_COPY as C } from "@/lib/copy/stock/trades";
import type { TapeTrade, TradeStrength } from "@/lib/types/stock/trades";

export interface TradeStrengthPanelProps {
  ticker: string;
  /** compact = /intraday 단타(밀도 최대·10건) · full = /stock 종목상세(약간의 여백·30건). 기본 full. */
  variant?: "compact" | "full";
  /** 지면 판단(선택 종목 없으면 false). 기본 true. */
  enabled?: boolean;
  /** 제목 헤더 숨김 — 상위 탭이 이미 라벨을 그릴 때(초광폭 탭 모드). 기본 false. */
  hideHeader?: boolean;
  className?: string;
}

/** 지면별 폴링 주기(ms) — 단타 촘촘·상세 느슨(OrderbookPanel 과 동일 정책). */
const REFETCH_MS = { compact: 3_000, full: 10_000 } as const;
/** 테이프 표시 건수 — compact 10 · full 30(DESIGN R4). */
const TAPE_LIMIT = { compact: 10, full: 30 } as const;

export function TradeStrengthPanel({
  ticker,
  variant = "full",
  enabled = true,
  hideHeader = false,
  className,
}: TradeStrengthPanelProps) {
  const { isMobile } = useBreakpoint();
  const { data, isLoading } = useQueryStockTrades(ticker, {
    enabled,
    refetchIntervalMs: REFETCH_MS[variant],
  });
  const compact = variant === "compact";
  const result = data;
  const tape = (result?.trades ?? []).slice(0, TAPE_LIMIT[variant]);

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
      {!hideHeader ? (
        <header className="flex items-center justify-between">
          <h2 className={cn("text-text-strong", compact ? "text-label-sm" : "text-h2")}>
            {C.title}
          </h2>
        </header>
      ) : null}

      {isLoading && !result ? (
        <TradesSkeleton compact={compact} rows={TAPE_LIMIT[variant]} />
      ) : !result || result.isEmpty ? (
        <TradesEmpty />
      ) : (
        <div className={cn("flex flex-col", compact ? "gap-xs" : "gap-sm")}>
          <StrengthGauge strength={result.strength} compact={compact} />
          <div className="my-xs h-px bg-border-line" aria-hidden />
          <TradeTape tape={tape} compact={compact} isMobile={isMobile} />
        </div>
      )}
    </section>
  );
}

// ─── 체결강도 게이지 ──────────────────────────────────────────────────────────

function StrengthGauge({
  strength,
  compact,
}: {
  strength: TradeStrength;
  compact: boolean;
}) {
  const known = strength.strength != null;
  const buyPct = known ? Math.round(strength.strength! * 100) : 0;
  const sellPct = known ? 100 - buyPct : 0;

  return (
    <div className={cn("flex flex-col", compact ? "gap-xs" : "gap-sm")}>
      <div className="flex items-center gap-sm">
        <span className="text-label-sm text-primary">{C.strengthLabel}</span>
        <span
          className="rounded-sm bg-accent-soft px-xs py-xs text-caption text-text-muted"
          title={C.approxTooltip}
        >
          {C.approxChip}
        </span>
      </div>

      {/* 누적 가로 바 — 좌 매수(signal-up-soft) · 우 매도(signal-down-soft). 세그먼트는 장식(텍스트 없음). */}
      <div className="flex h-strength-gauge-h w-full overflow-hidden rounded-sm bg-surface-muted">
        {known ? (
          <>
            <div className="h-full bg-signal-up-soft" style={{ width: `${buyPct}%` }} aria-hidden />
            <div className="h-full bg-signal-down-soft" style={{ width: `${sellPct}%` }} aria-hidden />
          </>
        ) : null}
      </div>

      {/* readout — 흰 배경 위 원색 mono-numeric(AA). 색 단독 아니라 글자 병기. */}
      {known ? (
        <div className="flex items-center justify-between">
          <span className="text-mono-numeric tabular-nums text-signal-up">
            {C.buy} {buyPct}%
          </span>
          <span className="text-mono-numeric tabular-nums text-signal-down">
            {C.sell} {sellPct}%
          </span>
        </div>
      ) : (
        <p className="text-caption text-text-muted">{C.strengthUnknown}</p>
      )}
    </div>
  );
}

// ─── 체결 테이프 ──────────────────────────────────────────────────────────────

function TradeTape({
  tape,
  compact,
  isMobile,
}: {
  tape: TapeTrade[];
  compact: boolean;
  isMobile: boolean;
}) {
  return (
    <div className="flex flex-col">
      <p className="text-label-sm text-primary">{C.tapeLabel}</p>
      <div className="mt-xs flex flex-col">
        {tape.map((trade, i) => (
          <TradeRow
            key={`${trade.timestamp}-${i}`}
            trade={trade}
            compact={compact}
            isMobile={isMobile}
          />
        ))}
      </div>
    </div>
  );
}

function TradeRow({
  trade,
  compact,
  isMobile,
}: {
  trade: TapeTrade;
  compact: boolean;
  isMobile: boolean;
}) {
  const priceColor =
    trade.side === "buy"
      ? "text-signal-up"
      : trade.side === "sell"
        ? "text-signal-down"
        : "text-text-muted";
  return (
    <div
      className={cn(
        "grid grid-cols-[auto_1fr_auto] items-center gap-sm",
        compact ? "h-orderbook-row-h-compact" : "h-orderbook-row-h",
      )}
    >
      <span className="text-caption tabular-nums text-text-muted">
        {formatTime(trade.timestamp, !compact)}
      </span>
      <span
        className={cn(
          "text-right tabular-nums",
          compact ? "text-caption" : "text-table-cell-numeric",
          priceColor,
        )}
      >
        {formatPrice(trade.price)}
      </span>
      <span className="min-w-[3rem] text-right text-caption tabular-nums text-text-muted">
        {formatQty(trade.volume, isMobile)}
      </span>
    </div>
  );
}

// ─── 빈 체결 / 스켈레톤 ───────────────────────────────────────────────────────

function TradesEmpty() {
  // 장중 빈 응답은 "미지원", 장외는 "장 마감" 으로 안내(둘 다 동일 제목).
  // 폴링 게이트와 동일 기준(②의 `isRegularOpen`, 공휴일 인지·fail-open)으로 마감 표시 정합.
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

function TradesSkeleton({ compact, rows }: { compact: boolean; rows: number }) {
  return (
    <div className="flex animate-pulse flex-col gap-xs" aria-hidden>
      <div className="h-strength-gauge-h rounded-sm bg-surface-muted" />
      {Array.from({ length: rows }).map((_, i) => (
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

/** 체결 시각 — KST 벽시계(원본 +09:00). compact=HH:MM · full=HH:MM:SS. 파싱 실패 시 원본 앞 5자. */
function formatTime(timestamp: string, withSeconds: boolean): string {
  const ms = Date.parse(timestamp);
  if (!Number.isFinite(ms)) return timestamp.slice(11, withSeconds ? 19 : 16);
  return new Date(ms).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
    hour12: false,
    timeZone: "Asia/Seoul",
  });
}

/** 가격 — 천 단위 콤마(정수). */
function formatPrice(value: number): string {
  return Math.round(value).toLocaleString("ko-KR");
}

/** 체결량 — 모바일은 만/억 축약으로 폭 절약, 그 외는 콤마 정수. */
function formatQty(qty: number, abbrev: boolean): string {
  if (!Number.isFinite(qty) || qty <= 0) return "0";
  if (!abbrev) return Math.round(qty).toLocaleString("ko-KR");
  if (qty >= 100_000_000) return `${(qty / 100_000_000).toFixed(1)}억`;
  if (qty >= 10_000) return `${(qty / 10_000).toFixed(1)}만`;
  return Math.round(qty).toLocaleString("ko-KR");
}
