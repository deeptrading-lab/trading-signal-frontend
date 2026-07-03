"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import type { StockDirection } from "@/lib/store/stockMetaStore";

/**
 * 글로벌 Peek — 전역 컨텍스트("차트 어디서든" T3).
 *
 * 종목 참조 행(랭킹·관심·검색)의 hover/롱프레스 의도를 받아 **미니 차트 미리보기**를 셸 한 곳에서
 * 소환한다. `aiAnalysisProvider` 와 동형 — 상태를 `(main)` 레이아웃이 소유하고 호스트
 * (`GlobalStockPeek`)가 단일 오버레이를 렌더한다.
 *
 * ## 단일 활성 Peek(rate-limit 안전 설계)
 * 활성 Peek 은 항상 **하나(한 종목)** 다. 여러 행을 지나가도 표시 중인 Peek 은 하나뿐이라,
 * 화면에 뜬 그 종목의 **가격 1쿼리 + 차트 1쿼리**만 발생한다(행마다 선반입하는 burst 아님).
 * `MiniStockChart`(→ `useQueryStockChart`)는 **1일 staleTime** 이라 같은 종목 재hover 는 캐시 히트
 * (쿼리키=ticker·period·days). 선반입이 데운 `stock.price` 캐시는 peek 이 그대로 히트하고, 차트는
 * 상세가 **같은 구간**을 볼 때만 공유·히트한다(구간이 다르면 재요청). 이 캐시 + 단일 활성 설계가
 * KIS 레이트리밋을 압박하지 않는 핵심이다.
 *
 * ## 컨텍스트 분리(리렌더 격리)
 * - **actions**: `showPopover`/`openSheet`/`hidePopover`/`close` — 식별자 안정. 종목 행(다수)이 구독.
 * - **state**: 활성 `peek` — 표시/숨김마다 바뀌므로 호스트(1곳)만 구독한다.
 *   → Peek 이 뜨고 질 때 30개 관심행이 리렌더되지 않는다.
 */

/** 즉시 페인트용 시드 — 목록 행이 이미 아는 시세(가격 쿼리 도착 전 표시). */
export interface PeekSeed {
  price: number;
  changePercent: number;
  direction: StockDirection;
}

export type PeekMode = "popover" | "sheet";

export interface PeekTarget {
  ticker: string;
  name: string;
  mode: PeekMode;
  /** 팝오버 좌표 앵커(뷰포트 기준). sheet 모드는 무시. */
  anchor?: { x: number; y: number };
  /** 즉시 페인트 시드(없으면 가격 쿼리 로딩 표시). */
  seed?: PeekSeed;
}

/** 호스트가 소비하는 표시 요청 payload(mode 는 액션이 부여). */
type PeekRequest = Omit<PeekTarget, "mode">;

export interface PeekActions {
  /** 데스크탑 hover — 커서 앵커 팝오버 표시. */
  showPopover: (req: PeekRequest) => void;
  /** 모바일 롱프레스 — 바텀시트 열기(앵커 불필요). */
  openSheet: (req: Omit<PeekRequest, "anchor">) => void;
  /** hover 종료 — 팝오버만 닫는다(열린 시트는 유지). */
  hidePopover: () => void;
  /** 팝오버·시트 모두 닫기. */
  close: () => void;
}

const PeekActionsContext = createContext<PeekActions | null>(null);
const PeekStateContext = createContext<PeekTarget | null>(null);

/** 행(트리거)이 구독 — 없으면 null(Peek 비활성, 선반입은 별도로 동작). */
export function useStockPeekActions(): PeekActions | null {
  return useContext(PeekActionsContext);
}

/** 호스트가 구독 — 현재 활성 Peek(없으면 null). */
export function useStockPeekState(): PeekTarget | null {
  return useContext(PeekStateContext);
}

export function StockPeekProvider({ children }: { children: React.ReactNode }) {
  const [peek, setPeek] = useState<PeekTarget | null>(null);

  // 라우트 이동 시 즉시 해제(팝오버·시트 모두) — hover→클릭/Enter 내비게이션 후 pointer-events-none
  //   팝오버가 목적지 화면에 떠 있는 채로 남는 것을 방지(aiAnalysisProvider 의 collapse 와 동형).
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    setPeek(null);
  }, [pathname]);

  const showPopover = useCallback((req: PeekRequest) => {
    setPeek({ ...req, mode: "popover" });
  }, []);

  const openSheet = useCallback((req: Omit<PeekRequest, "anchor">) => {
    setPeek({ ...req, mode: "sheet" });
  }, []);

  const hidePopover = useCallback(() => {
    // 팝오버일 때만 닫는다 — 롱프레스로 연 시트를 mouseleave 가 닫지 않도록.
    setPeek((prev) => (prev?.mode === "popover" ? null : prev));
  }, []);

  const close = useCallback(() => setPeek(null), []);

  const actions = useMemo<PeekActions>(
    () => ({ showPopover, openSheet, hidePopover, close }),
    [showPopover, openSheet, hidePopover, close],
  );

  return (
    <PeekActionsContext.Provider value={actions}>
      <PeekStateContext.Provider value={peek}>
        {children}
      </PeekStateContext.Provider>
    </PeekActionsContext.Provider>
  );
}
