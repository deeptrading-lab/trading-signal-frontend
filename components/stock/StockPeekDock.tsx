"use client";

import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { StockPeekContent } from "@/components/stock/StockPeekContent";
import { DURATION, EASE } from "@/lib/motion/tokens";
import { PEEK_HINT_DESKTOP } from "@/lib/copy/stock/peek";
import type { PeekTarget } from "@/hooks/stock/peekProvider";

/**
 * StockPeekDock — 초광폭 데스크탑에서 순위표 우측 여백에 고정되는 큰 미리보기 패널.
 *
 * ## 팝오버 대신 도킹하는 조건(호스트가 판정)
 * `GlobalStockPeek` 가 `useMediaQuery(PEEK_DOCK_QUERY)` 로 **콘텐츠(1152px) 우측에 진짜 빈 여백이
 * 생기는 초광폭**(≈1920px+)에서만 이 컴포넌트를 팝오버 대신 렌더한다. 그 미만은 커서 앵커 팝오버.
 * 모바일 롱프레스는 시트(변경 없음).
 *
 * ## 커서를 쫓지 않는 고정 배치(안정성)
 * 팝오버가 커서를 따라 떠 시선이 흔들리는 것과 달리, 도크는 뷰포트 우측·세로 중앙에 **고정**되고
 * 행을 옮겨도 위치가 그대로다(내용만 교체). 커서 앵커가 아니므로 스크롤로 좌표가 stale 해지지 않아
 * 팝오버의 scroll/resize 숨김 로직도 불필요하다.
 *
 * ## 더 큰 차트 + 축
 * 팝오버(96px, 축 없음)보다 큰 차트 높이 + 축 노출로 읽기 편한 미리보기를 제공한다.
 *
 * ## a11y·상호작용
 * `pointer-events-none` — 팝오버와 동일 시맨틱(아래 행 클릭/hover 통과, 보조적 시각 미리보기).
 * 행 aria-label 이 시맨틱을 담당하므로 `aria-hidden`. `prefers-reduced-motion` 시 진입 트랜지션 생략.
 * 폭·우측 여백은 runtime-positioned 치수라 JS 상수(팝오버 PEEK_WIDTH 관례 동일 — Tailwind 토큰 대상 아님).
 */

/** 도크 패널 폭(px) — ≈1920px 초광폭에서 1152 콘텐츠 우측 여백(≈280px)에 겹침 없이 들어가는 치수. */
const DOCK_WIDTH = 248;
/** 뷰포트 우측 가장자리로부터의 여백(px). */
const DOCK_RIGHT_GAP = 16;
/** 도크 미니 차트 높이(px) — 팝오버(96)보다 큰 미리보기. */
const DOCK_CHART_HEIGHT = 220;

export interface StockPeekDockProps {
  target: PeekTarget;
}

// 도크는 고정 배치라 팝오버와 달리 scroll/resize 숨김이 필요 없다 — 숨김은 행 mouseleave →
// provider `hidePopover` 로 처리되므로 onHide prop 을 받지 않는다(팝오버와 시그니처가 다른 이유).
export function StockPeekDock({ target }: StockPeekDockProps) {
  const reduced = useReducedMotion();

  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.aside
      // 보조적 시각 미리보기 — 행 aria-label 이 시맨틱을 담당하므로 SR 에서 숨긴다(중복 낭독 방지).
      aria-hidden="true"
      className="pointer-events-none fixed top-1/2 z-[60] -translate-y-1/2 rounded-lg border border-border-line bg-surface-elevated p-md shadow-overlay"
      style={{ right: DOCK_RIGHT_GAP, width: DOCK_WIDTH }}
      initial={reduced ? false : { opacity: 0, x: 8, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
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
        chartHeight={DOCK_CHART_HEIGHT}
        showAxis
      />

      {/* 상세 진입 안내 */}
      <p className="mt-sm border-t border-border-line pt-sm text-center text-caption text-text-muted">
        {PEEK_HINT_DESKTOP}
      </p>
    </motion.aside>,
    document.body,
  );
}
