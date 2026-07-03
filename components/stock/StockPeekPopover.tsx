"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { StockPeekContent } from "@/components/stock/StockPeekContent";
import { computePeekPosition } from "@/lib/utils/peekPosition";
import { DURATION, EASE } from "@/lib/motion/tokens";
import { PEEK_HINT_DESKTOP } from "@/lib/copy/stock/peek";
import type { PeekTarget } from "@/hooks/stock/peekProvider";

/**
 * StockPeekPopover — 데스크탑 hover 미리보기(유일한 floating 카드).
 *
 * ## 배치 — "빈 여백" 버그 회피
 * `computePeekPosition`(순수)으로 **커서 앵커 + 뷰포트 클램프 + 가장자리 플립**을 계산해 시선
 * 근처에 붙인다. 뷰포트 치수(`window.innerWidth/Height`)는 반응형 분기가 아니라 floating 요소
 * 클램프용 좌표 계산이다(useBreakpoint 는 boolean 만 제공 → 부적합).
 *
 * ## a11y·상호작용
 * `pointer-events-none` — 아래 행의 클릭/hover 가 그대로 통과한다(포커스 트랩·플리커 없음, 행에
 * 머무는 동안만 표시). 보조적 시각 미리보기라 `aria-hidden`(행의 aria-label 이 시맨틱을 담당).
 * 스크롤/리사이즈로 고정 좌표가 stale 해지면 즉시 숨긴다.
 *
 * `prefers-reduced-motion` 시 진입 트랜지션 생략(모션 토큰 사용).
 */

/** 팝오버 폭(px) — 클램프 계산과 렌더 폭 공유(runtime-positioned 치수). */
const PEEK_WIDTH = 264;
/** 클램프용 높이 추정(px) — 헤더+시세+차트+힌트 고정 높이라 안정적. */
const PEEK_EST_HEIGHT = 236;
/** 상단 클램프(sticky 헤더 navbar-h 60 아래). */
const TOP_MIN = 64;
/** 팝오버 미니 차트 높이(px). */
const CHART_HEIGHT = 96;

export interface StockPeekPopoverProps {
  target: PeekTarget;
  onHide: () => void;
}

export function StockPeekPopover({ target, onHide }: StockPeekPopoverProps) {
  const reduced = useReducedMotion();
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const anchor = target.anchor;

  // 앵커/종목 바뀔 때 좌표 재계산(뷰포트 클램프). 페인트 전 layout effect 로 깜빡임 없이.
  useLayoutEffect(() => {
    if (!anchor) return;
    const { left, top } = computePeekPosition(
      anchor,
      { width: window.innerWidth, height: window.innerHeight },
      { width: PEEK_WIDTH, height: PEEK_EST_HEIGHT },
      { topMin: TOP_MIN },
    );
    setPos({ left, top });
  }, [anchor]);

  // 스크롤/리사이즈 시 숨김 — 고정 좌표가 행 위치와 어긋나므로.
  useEffect(() => {
    const hide = () => onHide();
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [onHide]);

  if (typeof document === "undefined" || !pos) return null;

  return createPortal(
    <motion.div
      // 보조적 시각 미리보기 — 행 aria-label 이 시맨틱을 담당하므로 SR 에서 숨긴다(중복 낭독 방지).
      aria-hidden="true"
      className="pointer-events-none fixed z-[60] rounded-lg border border-border-line bg-surface-elevated p-md shadow-overlay"
      style={{ left: pos.left, top: pos.top, width: PEEK_WIDTH }}
      initial={reduced ? false : { opacity: 0, y: 4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: DURATION.fast, ease: EASE.standard }}
    >
      {/* 종목명(코드 미표시) */}
      <div className="mb-sm min-w-0">
        <span className="block truncate text-body-sm-strong text-text-strong">
          {target.name}
        </span>
      </div>

      <StockPeekContent
        ticker={target.ticker}
        seed={target.seed}
        chartHeight={CHART_HEIGHT}
      />

      {/* 상세 진입 안내 */}
      <p className="mt-sm border-t border-border-line pt-sm text-center text-caption text-text-muted">
        {PEEK_HINT_DESKTOP}
      </p>
    </motion.div>,
    document.body,
  );
}
