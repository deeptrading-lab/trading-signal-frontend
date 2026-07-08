/**
 * StockDepthSection — `/stock/[ticker]` 호가창 + 체결강도 묶음(반응형 배치).
 *
 * 폭에 따라 두 패널의 배치를 바꾼다:
 *   - 초광폭(≥1920px, `PEEK_DOCK_QUERY`): 콘텐츠(1152px) 우측 여백이 커지는 구간 — 둘을 나란히
 *     두는 대신 **세그먼트 탭**으로 전환한다(기본 호가창, 옆 탭 체결강도). 활성 탭만 렌더돼
 *     비활성 패널의 폴링도 멈춘다.
 *   - 그 미만: **호가창(좌) · 체결강도(우) 2단 그리드**(모바일은 세로 스택) — /intraday 워치 행을
 *     펼쳤을 때(IntradayWatchTable)와 같은 배치 언어.
 *
 * 초광폭 판정은 `useMediaQuery`(SSR=false → 마운트 후 실제 매칭) — 첫 렌더는 2단, 초광폭이면 마운트
 * 직후 탭으로 swap. 두 패널은 자족(내부에서 폴링)이라 여기선 배치·탭 상태만 소유한다.
 */

"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils/cn";
import { DURATION, EASE } from "@/lib/motion/tokens";
import { useMediaQuery } from "@/hooks/utils/useMediaQuery";
import { PEEK_DOCK_QUERY } from "@/hooks/stock/peekProvider";
import { SegmentedTabs } from "@/components/analyze/SegmentedTabs";
import { OrderbookPanel } from "@/components/stock/OrderbookPanel";
import { TradeStrengthPanel } from "@/components/stock/TradeStrengthPanel";
import { ORDERBOOK_COPY } from "@/lib/copy/stock/orderbook";
import { TRADES_COPY } from "@/lib/copy/stock/trades";

type DepthTab = "orderbook" | "trades";

const TAB_OPTIONS: ReadonlyArray<{ key: DepthTab; label: string }> = [
  { key: "orderbook", label: ORDERBOOK_COPY.title },
  { key: "trades", label: TRADES_COPY.title },
];

export function StockDepthSection({
  ticker,
  className,
}: {
  ticker: string;
  className?: string;
}) {
  const isUltraWide = useMediaQuery(PEEK_DOCK_QUERY);
  const reduced = useReducedMotion();
  const [tab, setTab] = useState<DepthTab>("orderbook");

  if (isUltraWide) {
    return (
      <div className={cn("flex flex-col gap-md", className)}>
        <SegmentedTabs
          options={TAB_OPTIONS}
          value={tab}
          onChange={setTab}
          ariaLabel={`${ORDERBOOK_COPY.title} · ${TRADES_COPY.title}`}
        />
        {/* 활성 탭만 마운트 — 비활성 패널 폴링 정지. 헤더는 탭이 라벨링하므로 숨김.
            전환은 짧은 크로스페이드(mode="wait" — 이전 패널이 사라진 뒤 새 패널 진입, 레이아웃 튐 없음). */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: DURATION.fast, ease: EASE.standard }}
          >
            {tab === "orderbook" ? (
              <OrderbookPanel ticker={ticker} variant="full" hideHeader />
            ) : (
              <TradeStrengthPanel ticker={ticker} variant="full" hideHeader />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // 광폭 아님 — 호가창(좌)·체결강도(우) 2단(모바일 세로 스택). 헤더는 각 컬럼 라벨로 유지.
  return (
    <div className={cn("grid grid-cols-1 gap-md sm:grid-cols-2", className)}>
      <OrderbookPanel ticker={ticker} variant="full" />
      <TradeStrengthPanel ticker={ticker} variant="full" />
    </div>
  );
}
