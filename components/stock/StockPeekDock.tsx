"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { StockPeekContent } from "@/components/stock/StockPeekContent";
import { PeekChart } from "@/components/stock/PeekChart";
import { DURATION, EASE } from "@/lib/motion/tokens";
import { PEEK_HINT_DESKTOP } from "@/lib/copy/stock/peek";
import { stockDetailPath } from "@/lib/utils/stockDetailPath";
import type { PeekTarget } from "@/hooks/stock/peekProvider";

/**
 * StockPeekDock — 초광폭 데스크탑에서 순위표 우측 여백에 고정되는 큰 미리보기 패널.
 *
 * ## 팝오버 대신 도킹하는 조건(호스트가 판정)
 * `GlobalStockPeek` 가 `useMediaQuery(PEEK_DOCK_QUERY)` 로 **콘텐츠(1152px) 우측에 진짜 빈 여백이
 * 생기는 초광폭**(≈1920px+)에서만 이 컴포넌트를 팝오버 대신 렌더한다. 그 미만은 커서 앵커 팝오버.
 * 모바일 롱프레스는 시트(변경 없음).
 *
 * ## 커서를 쫓지 않는 고정 배치(안정성) — 순위표 우측에 붙임
 * 팝오버가 커서를 따라 떠 시선이 흔들리는 것과 달리, 도크는 **콘텐츠(순위표) 우측 끝에 붙여** 세로
 * 중앙에 고정되고 행을 옮겨도 위치가 그대로다(내용만 교체). 뷰포트 가장자리가 아니라 표 옆이라
 * 시선 이동이 짧다. 커서 앵커가 아니라 스크롤로 좌표가 stale 해지지 않아 scroll 숨김 로직도 불필요.
 *
 * ## 다중 패널 차트 + 여백에 맞춘 가변 폭
 * 팝오버(96px 캔들만)와 달리 도크는 `PeekChart`(가격+이동평균선·거래량·MACD·RSI)를 주입해 상세에
 * 가까운 미리보기를 준다(사용자 요청). 좌측은 콘텐츠 우측 끝 + 간격에 앵커하고, 폭은 거기서 뷰포트
 * 우측 여백 전까지 `[MIN, MAX]` 클램프 — 1920px 은 최소(≈248px), 초광폭은 넓혀("좀 더 크게") 표
 * 옆에 붙고 far-right 는 빈다. 가격 패널 높이도 폭에 비례(서브플롯은 그 아래 고정 높이로 누적).
 *
 * ## a11y·상호작용(인터랙티브 — 차트 툴팁)
 * 팝오버(`pointer-events-none`)와 달리 도크는 `pointer-events-auto` 라 **차트를 hover 해 툴팁**을 볼 수
 * 있다(고정 배치라 커서를 안 쫓아 안정적). 행에서 도크로 커서가 건너가는 동안 닫히지 않도록,
 * 도크 `onMouseEnter` 는 `onKeepAlive`(provider `cancelHide`)로 대기 hide 를 취소하고, `onMouseLeave`
 * 는 `onLeave`(`hidePopover`)로 닫는다. 도크 모드 hide 유예는 provider 가 소유(#268 가변 폭으로
 * 행↔도크 간격이 작아 유예로 충분). 포커스 가능 자식이 없어 `aria-hidden` 유지(행 aria-label 이
 * 시맨틱 담당, 키보드/SR 은 행·상세로 접근). `prefers-reduced-motion` 시 진입 트랜지션 생략.
 * 폭·우측 여백은 runtime-positioned 치수라 JS 상수(팝오버 PEEK_WIDTH 관례 동일 — Tailwind 토큰 대상 아님).
 */

/** 도크 최소 폭(px) — ≈1920px 에서 콘텐츠 우측 여백에 겹침 없이 들어가는 치수. */
const DOCK_MIN_WIDTH = 248;
/** 도크 최대 폭(px) — 초광폭에서도 과하게 커지지 않도록 상한. */
const DOCK_MAX_WIDTH = 400;
/** 콘텐츠(순위표) 우측 끝과 도크 좌측 사이 간격(px) — 표에 "붙어서" 뜨는 시각. */
const DOCK_CONTENT_GAP = 12;
/** 도크 우측과 뷰포트 가장자리 사이 최소 여백(px). */
const DOCK_VIEWPORT_MARGIN = 16;
/** 홈/관심 콘텐츠 컨테이너 최대 폭(px) — `spacing.main-max-w` 토큰과 동기(여백 산출용 레이아웃 상수). */
const MAIN_MAX_W = 1152;

/**
 * 도크 배치 — **콘텐츠(순위표) 우측 끝에 붙여** 좌측 앵커로 띄운다(뷰포트 가장자리 아님).
 *   콘텐츠 우측 x = main.left + min(main.width, (main.width + 1152) / 2). 좌측 = 그 x + 간격.
 *   폭 = 좌측부터 뷰포트 우측 여백 전까지, `[MIN, MAX]` 클램프(초광폭이면 표 옆에 붙고 far-right 는 빈다).
 *   `<main>` 미발견 시 우측 가장자리 폴백(기존 동작). 호스트의 ≥1920 게이트가 최소 여백을 보장.
 */
function measureDockLayout(): { left: number; width: number } {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return { left: 0, width: DOCK_MIN_WIDTH };
  }
  const viewportW = window.innerWidth;
  const rect = document.querySelector("main")?.getBoundingClientRect();
  if (!rect) {
    return {
      left: viewportW - DOCK_VIEWPORT_MARGIN - DOCK_MIN_WIDTH,
      width: DOCK_MIN_WIDTH,
    };
  }
  // 콘텐츠 우측 끝(중앙 1152 정렬; main 이 1152 이하면 main 우측 끝).
  const contentRight = rect.left + Math.min(rect.width, (rect.width + MAIN_MAX_W) / 2);
  const left = contentRight + DOCK_CONTENT_GAP;
  const available = viewportW - left - DOCK_VIEWPORT_MARGIN;
  const width = Math.round(
    Math.min(DOCK_MAX_WIDTH, Math.max(DOCK_MIN_WIDTH, available)),
  );
  return { left: Math.round(left), width };
}

export interface StockPeekDockProps {
  target: PeekTarget;
  /** 도크 hover 진입 — 대기 중 hide 취소(행→도크 건너감 유지). */
  onKeepAlive: () => void;
  /** 도크 hover 종료 — 닫기(provider `hidePopover`). */
  onLeave: () => void;
}

// 도크는 고정 배치라 팝오버와 달리 scroll/resize 숨김이 필요 없다 — 숨김은 행/도크 mouseleave →
// provider `hidePopover`(도크 모드 grace 지연) 로 처리된다.
export function StockPeekDock({
  target,
  onKeepAlive,
  onLeave,
}: StockPeekDockProps) {
  const reduced = useReducedMotion();
  const router = useRouter();
  // 콘텐츠 우측 끝에 붙는 좌측 앵커 + 폭. 도크는 client-only(dynamic ssr:false)라 lazy init 로 실측.
  const [layout, setLayout] = useState(measureDockLayout);

  // 마운트·리사이즈 시 배치 실측 → 갱신. 페인트 전 layout effect 로 깜빡임 없이.
  useLayoutEffect(() => {
    const update = () => setLayout(measureDockLayout());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (typeof document === "undefined") return null;

  // 차트 높이도 폭에 비례(넓을수록 크게), 팝오버보다 큰 하한 유지.
  const chartHeight = Math.min(360, Math.max(220, Math.round(layout.width * 0.9)));

  return createPortal(
    <motion.aside
      // 보조적 시각 미리보기 — 행 aria-label 이 시맨틱을 담당하므로 SR 에서 숨긴다(중복 낭독 방지).
      aria-hidden="true"
      // 인터랙티브 — 차트 툴팁 hover 가능. 행→도크 건너감 유지(enter=cancelHide, leave=hide).
      //   클릭 시 상세 이동(힌트 "클릭하면 상세로 이동" 과 일치 — 팝오버는 통과 클릭이라 행이 처리).
      onMouseEnter={onKeepAlive}
      onMouseLeave={onLeave}
      onClick={() => router.push(stockDetailPath(target.ticker, target.name))}
      className="pointer-events-auto fixed top-1/2 z-[60] -translate-y-1/2 cursor-pointer rounded-lg border border-border-line bg-surface-elevated p-md shadow-overlay"
      style={{ left: layout.left, width: layout.width }}
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
        chart={<PeekChart ticker={target.ticker} priceHeight={chartHeight} />}
      />

      {/* 상세 진입 안내 */}
      <p className="mt-sm border-t border-border-line pt-sm text-center text-caption text-text-muted">
        {PEEK_HINT_DESKTOP}
      </p>
    </motion.aside>,
    document.body,
  );
}
