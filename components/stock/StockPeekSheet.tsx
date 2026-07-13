"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { StockPeekContent } from "@/components/stock/StockPeekContent";
import { MiniStockChart } from "@/components/stock/MiniStockChart";
import { useOverlayBackClose } from "@/hooks/utils/useOverlayBackClose";
import { DURATION, EASE } from "@/lib/motion/tokens";
import { stockDetailPath } from "@/lib/utils/stockDetailPath";
import {
  PEEK_ARIA,
  PEEK_SHEET_CLOSE,
  PEEK_SHEET_CTA,
} from "@/lib/copy/stock/peek";
import type { PeekTarget } from "@/hooks/stock/peekProvider";

/**
 * StockPeekSheet — 모바일 롱프레스 미리보기(바텀시트).
 *
 * 기존 시트 패턴(`IntradayPaperDetailSheet`)과 동형 — 포털 + backdrop +
 * Escape 닫기 + 배경 스크롤 잠금. 큰 미니 차트(축 노출) + 상세 진입 CTA. 롱프레스는 정상 탭→
 * 내비게이션을 막지 않으므로(useStockPeek 이 유령 클릭 차단), 여기선 열림 상태만 렌더한다.
 *
 * `prefers-reduced-motion` 시 슬라이드/페이드 생략(모션 토큰 사용).
 */

/** 시트 미니 차트 높이(px) — 팝오버보다 크게(축 노출). */
const SHEET_CHART_HEIGHT = 200;

export interface StockPeekSheetProps {
  target: PeekTarget;
  onClose: () => void;
}

export function StockPeekSheet({ target, onClose }: StockPeekSheetProps) {
  const reduced = useReducedMotion();
  const router = useRouter();

  // Escape 로 닫기 + 배경 스크롤 잠금(기존 시트 동일).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // 모바일 뒤로가기 → 시트만 닫기(라우트 유지) — AI 패널·체결내역 시트·업종 모달과 동일 패턴
  // (overlay-back-close). 열릴 때만 마운트되는 컴포넌트라 open=true 고정. 상세 진입(goDetail)의
  // router.push 경로는 훅이 marker 를 소비하거나(선행 시) 매몰 처리(후행 시)해 어느 쪽도 안전.
  useOverlayBackClose(true, onClose);

  const goDetail = () => {
    onClose();
    router.push(stockDetailPath(target.ticker, target.name));
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={PEEK_ARIA(target.name)}
    >
      {/* backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/40"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />

      {/* 바텀시트 — 하단 고정 + 상단 라운드. safe-area 하단 여백 확보. */}
      <motion.div
        className="relative w-full rounded-t-xl bg-surface p-lg pb-[calc(theme(spacing.lg)+env(safe-area-inset-bottom))] shadow-overlay sm:max-w-[32rem]"
        initial={reduced ? false : { y: "100%" }}
        animate={{ y: 0 }}
        transition={{ duration: DURATION.base, ease: EASE.standard }}
      >
        {/* 헤더 — 종목명(코드 미표시) + 닫기 */}
        <div className="mb-md flex items-center justify-between gap-md">
          <span className="min-w-0 flex-1 truncate text-h1 font-bold text-text-strong">
            {target.name}
          </span>
          <button
            type="button"
            aria-label={PEEK_SHEET_CLOSE}
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-muted hover:text-text-strong"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <StockPeekContent
          ticker={target.ticker}
          seed={target.seed}
          chart={
            <MiniStockChart
              ticker={target.ticker}
              height={SHEET_CHART_HEIGHT}
              showAxis
            />
          }
        />

        <button
          type="button"
          onClick={goDetail}
          className="button-primary mt-md w-full text-center"
        >
          {PEEK_SHEET_CTA}
        </button>
      </motion.div>
    </div>,
    document.body,
  );
}
