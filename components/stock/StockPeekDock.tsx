"use client";

import { useLayoutEffect, useState } from "react";
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
 * ## 더 큰 차트 + 축 + 여백에 맞춘 가변 폭
 * 팝오버(96px, 축 없음)보다 큰 차트 + 축. 폭은 **콘텐츠 우측 여백을 실측해 스케일**한다 — 1920px 에선
 * 최소(≈248px)이지만 초광폭(2560px 등)에선 넓혀 더 큰 차트를 준다("좀 더 크게"). 콘텐츠와 겹치지
 * 않도록 여백에서 우측 갭·최소 간격을 뺀 만큼만, `[MIN, MAX]` 로 클램프. 차트 높이도 폭에 비례.
 *
 * ## a11y·상호작용
 * `pointer-events-none` — 팝오버와 동일 시맨틱(아래 행 클릭/hover 통과, 보조적 시각 미리보기).
 * 행 aria-label 이 시맨틱을 담당하므로 `aria-hidden`. `prefers-reduced-motion` 시 진입 트랜지션 생략.
 * 폭·우측 여백은 runtime-positioned 치수라 JS 상수(팝오버 PEEK_WIDTH 관례 동일 — Tailwind 토큰 대상 아님).
 */

/** 도크 최소 폭(px) — ≈1920px 에서 1152 콘텐츠 우측 여백(≈280px)에 겹침 없이 들어가는 치수. */
const DOCK_MIN_WIDTH = 248;
/** 도크 최대 폭(px) — 초광폭에서도 과하게 커지지 않도록 상한. */
const DOCK_MAX_WIDTH = 400;
/** 뷰포트 우측 가장자리로부터의 여백(px). */
const DOCK_RIGHT_GAP = 16;
/** 콘텐츠 우측 끝과 도크 좌측 사이 최소 간격(px) — 겹침·답답함 방지. */
const DOCK_CONTENT_GAP = 12;
/** 홈/관심 콘텐츠 컨테이너 최대 폭(px) — `spacing.main-max-w` 토큰과 동기(여백 산출용 레이아웃 상수). */
const MAIN_MAX_W = 1152;

/**
 * 콘텐츠(중앙 1152px) 우측 빈 여백에 맞춘 도크 폭 산출.
 *   여백 = (main 실폭 − 1152) / 2. 도크 폭 = 여백 − 우측갭 − 최소간격, `[MIN, MAX]` 클램프.
 *   `<main>` 미발견·여백 부족 시 MIN(호스트의 ≥1920 게이트가 이미 최소 여백을 보장).
 */
function measureDockWidth(): number {
  if (typeof document === "undefined") return DOCK_MIN_WIDTH;
  const main = document.querySelector("main");
  const mainWidth = main?.clientWidth ?? 0;
  const gutter = (mainWidth - MAIN_MAX_W) / 2;
  const available = gutter - DOCK_RIGHT_GAP - DOCK_CONTENT_GAP;
  return Math.round(
    Math.min(DOCK_MAX_WIDTH, Math.max(DOCK_MIN_WIDTH, available)),
  );
}

export interface StockPeekDockProps {
  target: PeekTarget;
}

// 도크는 고정 배치라 팝오버와 달리 scroll/resize 숨김이 필요 없다 — 숨김은 행 mouseleave →
// provider `hidePopover` 로 처리되므로 onHide prop 을 받지 않는다(팝오버와 시그니처가 다른 이유).
export function StockPeekDock({ target }: StockPeekDockProps) {
  const reduced = useReducedMotion();
  const [dockWidth, setDockWidth] = useState(DOCK_MIN_WIDTH);

  // 마운트·리사이즈 시 우측 여백 실측 → 폭 갱신. 페인트 전 layout effect 로 깜빡임 없이.
  useLayoutEffect(() => {
    const update = () => setDockWidth(measureDockWidth());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (typeof document === "undefined") return null;

  // 차트 높이도 폭에 비례(넓을수록 크게), 팝오버보다 큰 하한 유지.
  const chartHeight = Math.min(360, Math.max(220, Math.round(dockWidth * 0.9)));

  return createPortal(
    <motion.aside
      // 보조적 시각 미리보기 — 행 aria-label 이 시맨틱을 담당하므로 SR 에서 숨긴다(중복 낭독 방지).
      aria-hidden="true"
      className="pointer-events-none fixed top-1/2 z-[60] -translate-y-1/2 rounded-lg border border-border-line bg-surface-elevated p-md shadow-overlay"
      style={{ right: DOCK_RIGHT_GAP, width: dockWidth }}
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
        chartHeight={chartHeight}
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
