"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import { useQueryStockPrice } from "@/hooks/stock/useQueryStockPrice";
import { formatNumber } from "@/lib/utils/formatMoney";
import { formatPct } from "@/lib/utils/formatPct";
import { cn } from "@/lib/utils/cn";
import { PEEK_CHART_LABEL, PEEK_PRICE_ERROR } from "@/lib/copy/stock/peek";
import type { PeekSeed } from "@/hooks/stock/peekProvider";
import type { StockDirection } from "@/lib/store/stockMetaStore";

/**
 * StockPeekContent — Peek 팝오버/시트/도크 공용 본문(가격 + 등락% + 차트).
 *
 * 종목명(코드 미표시)은 컨테이너(팝오버/시트/도크 헤더)가 렌더하고, 여기선 시세와 차트만.
 * 시세는 `useQueryStockPrice`(도메인 훅)가 진실 원천 — 시드(seed)는 도착 전 즉시 페인트용.
 *
 * ## 차트는 지면이 주입(render-prop)
 * 좁은 팝오버/시트는 `MiniStockChart`(가격 캔들만), 넓은 도크는 `PeekChart`(가격+MA·거래량·MACD·RSI)를
 * 주입한다. 여기서 직접 import 하지 않는 이유: 이 컴포넌트는 세 지면 공용(공유 청크)이라, 무거운
 * `PeekChart` 를 import 하면 팝오버/시트 청크에까지 4패널 차트가 딸려간다(mobile-perf 저해). 차트를
 * 주입받으면 `PeekChart` 는 도크 청크에만 로드된다.
 */

/** 등락 방향 → 색 토큰(합성 클래스라 cn 사이즈 override 시에도 색 유지, 홈 랭킹과 동일). */
function changeClass(direction?: StockDirection): string {
  if (direction === "up") return "signal-up-text";
  if (direction === "down") return "signal-down-text";
  return "text-text-muted tabular-nums";
}

export interface StockPeekContentProps {
  ticker: string;
  seed?: PeekSeed;
  /** 차트 — 지면이 주입(팝오버/시트=MiniStockChart, 도크=PeekChart). */
  chart: React.ReactNode;
}

export function StockPeekContent({
  ticker,
  seed,
  chart,
}: StockPeekContentProps) {
  const { data, isError } = useQueryStockPrice(ticker);
  const price = data?.price ?? seed?.price;
  const changePercent = data?.changePercent ?? seed?.changePercent;
  const direction = data?.direction ?? seed?.direction;

  return (
    <>
      {/* 시세 줄 — 현재가 + 등락%(+시드/쿼리) + 차트 종류 라벨 */}
      <div className="flex items-baseline gap-sm">
        {price != null ? (
          <>
            <span className="text-h2 tabular-nums text-text-strong">
              {formatNumber(price)}
            </span>
            <span className={cn("text-body-sm-strong", changeClass(direction))}>
              {formatPct(changePercent, { sign: true })}
            </span>
          </>
        ) : isError ? (
          <span className="text-caption text-text-muted">{PEEK_PRICE_ERROR}</span>
        ) : (
          <Skeleton variant="line" className="mb-0 h-6 w-24" />
        )}
        <span className="ml-auto shrink-0 text-caption text-text-muted">
          {PEEK_CHART_LABEL}
        </span>
      </div>

      {/* 차트(주입) — 소환 즉시 1회 페치(단일 활성 Peek → burst 없음). */}
      <div className="mt-sm">{chart}</div>
    </>
  );
}
