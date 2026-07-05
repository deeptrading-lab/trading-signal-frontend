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
import { useMediaQuery } from "@/hooks/utils/useMediaQuery";
import type { StockDirection } from "@/lib/store/stockMetaStore";

/**
 * 우측 도킹 게이트(호스트·프로바이더 공용) — 콘텐츠(1152px) 우측에 도크가 겹침 없이 들어갈 초광폭.
 *   호스트: 팝오버 vs 도크 렌더 결정. 프로바이더: 도크 모드에서만 hover-hold(hide grace) 적용.
 */
export const PEEK_DOCK_QUERY = "(min-width: 1920px)";
/** 도크 모드 hover-hold — 행에서 도크로 커서가 건너갈 유예(ms). 팝오버 모드엔 미적용(즉시 hide). */
const DOCK_HIDE_GRACE_MS = 300;

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
 * - **actions**: `showPopover`/`openSheet`/`hidePopover`/`cancelHide`/`close` — 식별자 안정. 종목 행(다수)이 구독.
 * - **state**: 활성 `peek` — 표시/숨김마다 바뀌므로 호스트(1곳)만 구독한다.
 *   → Peek 이 뜨고 질 때 30개 관심행이 리렌더되지 않는다.
 *
 * ## 도크 인터랙티브(hover-hold)
 * 우측 도크(초광폭)는 `pointer-events-auto` 라 차트 툴팁을 hover 할 수 있다. 행에서 도크로 커서가
 * 건너가는 동안 행 mouseleave 가 도크를 닫지 않도록, **도크 모드에서만** `hidePopover` 를
 * `DOCK_HIDE_GRACE_MS` 지연하고(그 사이 도크 onMouseEnter → `cancelHide` 로 유지), 팝오버 모드는
 * 기존대로 즉시 닫는다(무회귀). 도크가 여백을 채워(가변 폭) 행↔도크 간격이 작아 유예로 충분히 건넌다.
 * canDock 은 **ref 로 읽어** 콜백 식별자 안정성(위 리렌더 격리)을 깨지 않는다.
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
  /** 데스크탑 hover — 커서 앵커 팝오버(또는 초광폭 도크) 표시. */
  showPopover: (req: PeekRequest) => void;
  /** 모바일 롱프레스 — 바텀시트 열기(앵커 불필요). */
  openSheet: (req: Omit<PeekRequest, "anchor">) => void;
  /** hover 종료 — 팝오버만 닫는다(도크 모드는 grace 지연, 시트는 유지). */
  hidePopover: () => void;
  /** 도크 hover 진입 — 대기 중 hide 취소(행→도크 건너감 유지). */
  cancelHide: () => void;
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

  // 초광폭(도크) 여부 — 콜백 식별자 안정을 위해 ref 로 읽는다(actions 는 마운트 후 불변 유지).
  //   렌더 중 ref 쓰기는 금지라 effect 로 동기화(canDock 은 1920px 경계 교차 시에만 바뀌어 지연 무관).
  const canDock = useMediaQuery(PEEK_DOCK_QUERY);
  const canDockRef = useRef(canDock);
  useEffect(() => {
    canDockRef.current = canDock;
  }, [canDock]);

  // 도크 모드 hover-hold 유예 타이머.
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearHideTimer = useCallback(() => {
    if (hideTimer.current !== null) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  // 팝오버만 닫는다(시트는 유지) — 대기 hide/show 공용.
  const hidePopoverNow = useCallback(() => {
    setPeek((prev) => (prev?.mode === "popover" ? null : prev));
  }, []);

  // 라우트 이동 시 즉시 해제(팝오버·시트 모두) — hover→클릭/Enter 내비게이션 후 pointer-events-none
  //   팝오버가 목적지 화면에 떠 있는 채로 남는 것을 방지(aiAnalysisProvider 의 collapse 와 동형).
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    clearHideTimer();
    setPeek(null);
  }, [pathname, clearHideTimer]);

  // 언마운트 시 대기 타이머 정리.
  useEffect(() => clearHideTimer, [clearHideTimer]);

  const showPopover = useCallback(
    (req: PeekRequest) => {
      clearHideTimer(); // 새 표시 요청 — 대기 중 hide 취소(행 이동 시 premature hide 방지).
      setPeek({ ...req, mode: "popover" });
    },
    [clearHideTimer],
  );

  const openSheet = useCallback(
    (req: Omit<PeekRequest, "anchor">) => {
      clearHideTimer();
      setPeek({ ...req, mode: "sheet" });
    },
    [clearHideTimer],
  );

  const hidePopover = useCallback(() => {
    clearHideTimer();
    // 도크 모드만 유예 — 행→도크로 커서가 건너갈 시간을 준다(도크 onMouseEnter 가 cancelHide 로 유지).
    //   팝오버 모드(비-초광폭)는 기존대로 즉시(무회귀).
    if (canDockRef.current) {
      hideTimer.current = setTimeout(hidePopoverNow, DOCK_HIDE_GRACE_MS);
    } else {
      hidePopoverNow();
    }
  }, [clearHideTimer, hidePopoverNow]);

  const cancelHide = useCallback(() => clearHideTimer(), [clearHideTimer]);

  const close = useCallback(() => {
    clearHideTimer();
    setPeek(null);
  }, [clearHideTimer]);

  const actions = useMemo<PeekActions>(
    () => ({ showPopover, openSheet, hidePopover, cancelHide, close }),
    [showPopover, openSheet, hidePopover, cancelHide, close],
  );

  return (
    <PeekActionsContext.Provider value={actions}>
      <PeekStateContext.Provider value={peek}>
        {children}
      </PeekStateContext.Provider>
    </PeekActionsContext.Provider>
  );
}
