"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePrefetchStockDetail } from "@/hooks/stock/usePrefetchStockDetail";
import {
  useStockPeekActions,
  type PeekSeed,
} from "@/hooks/stock/peekProvider";

/**
 * useStockPeek — 종목 참조 행에 Peek(미리보기) 트리거를 부착하는 소형 훅.
 *
 * 각 행은 자기 ticker/name/(시드)만 등록하고 반환된 `peekProps` 를 그대로 spread 한다 —
 * 좌표 계산·클램프·오버레이 렌더는 전부 전역 호스트가 담당(행마다 중복 로직 없음).
 *
 * ## 선반입과 동일 의도 신호에 부착
 * 내부에서 `usePrefetchStockDetail` 을 함께 소유해, 상세 선반입과 **똑같은 120ms 의도 지연**으로
 * Peek 을 띄운다(스쳐 지나가는 hover 는 미발화). 선반입이 데운 `stock.price` 캐시를 Peek 의
 * `useQueryStockPrice` 가 그대로 히트하므로 추가 호출이 없다.
 *
 * ## 입력 모달리티로 팝오버 vs 시트 분기(뷰포트 아님)
 * 데스크탑=hover 팝오버, 모바일=롱프레스 시트. 분기 기준은 **입력 종류**(mouse vs touch)이지
 * 뷰포트 너비가 아니다 — 터치 노트북/태블릿에서도 롱프레스는 시트, 좁은 데스크탑 창에서도
 * 마우스는 팝오버가 맞기 때문이다. 그래서 `useBreakpoint`(너비 분기)가 아니라 touch 이벤트
 * 타임스탬프 가드로 합성 mouseenter 를 억제한다.
 *
 * ## 정상 행 동작 무회귀
 * 클릭→상세 이동·선반입·키보드(Enter/Space)는 행이 그대로 소유한다. 본 훅은 hover/focus/touch
 * 만 얹는다. 롱프레스로 시트를 연 뒤 이어지는 유령 클릭(내비게이션)은 touchend preventDefault +
 * onClickCapture 로 이중 차단한다.
 */

/** 노스스타·선반입과 동일 hover 의도 지연. */
const PEEK_INTENT_MS = 120;
/** 롱프레스 임계(ms). */
const LONG_PRESS_MS = 450;
/** 롱프레스 취소 이동 허용치(px) — 이보다 크게 움직이면 스크롤/드래그로 간주. */
const MOVE_TOLERANCE = 10;
/** touch 후 합성 mouseenter/contextmenu 억제 창(ms). */
const TOUCH_GUARD_MS = 600;
/** 포커스 앵커 — 행 좌측에서 안으로 들인 지점(커서 앵커 근사). */
const FOCUS_ANCHOR_INSET = 40;

export interface UseStockPeekArgs {
  ticker: string;
  name: string;
  /** 행이 아는 시세(있으면 팝오버/시트 즉시 페인트). */
  seed?: PeekSeed;
}

export interface StockPeekBinding {
  /** 행 요소에 그대로 spread — hover/focus/touch 트리거 + 유령 클릭 차단. */
  peekProps: {
    onMouseEnter: (e: React.MouseEvent) => void;
    onMouseLeave: () => void;
    onFocus: (e: React.FocusEvent) => void;
    onBlur: () => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onContextMenu: (e: React.MouseEvent) => void;
    onClickCapture: (e: React.MouseEvent) => void;
  };
  /** 확정 의도(클릭) 선반입 — 행 onClick 에서 라우팅 직전 호출. */
  prefetch: (ticker: string) => void;
}

export function useStockPeek({
  ticker,
  name,
  seed,
}: UseStockPeekArgs): StockPeekBinding {
  const actions = useStockPeekActions();
  const { prefetch, onIntent, cancelIntent } = usePrefetchStockDetail();

  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  /** 마지막 touch 상호작용 시각(ms) — 합성 mouseenter 억제(타임스탬프 자동 만료, 리크 없음). */
  const touchActiveAt = useRef(0);
  /** 롱프레스로 시트를 열었음 — 이어지는 클릭(내비게이션)을 삼킨다. */
  const suppressClick = useRef(false);

  const clearPeekTimer = useCallback(() => {
    if (peekTimer.current !== null) {
      clearTimeout(peekTimer.current);
      peekTimer.current = null;
    }
  }, []);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const schedulePopover = useCallback(
    (anchor: { x: number; y: number }) => {
      if (!actions) return;
      clearPeekTimer();
      peekTimer.current = setTimeout(() => {
        actions.showPopover({ ticker, name, anchor, seed });
      }, PEEK_INTENT_MS);
    },
    [actions, ticker, name, seed, clearPeekTimer],
  );

  const onMouseEnter = useCallback(
    (e: React.MouseEvent) => {
      onIntent(ticker); // 상세 선반입(가격+회사) — Peek 이 재사용할 캐시를 데운다.
      // touch 직후 합성 mouseenter 면 팝오버 미표시(모바일=시트 경로).
      if (Date.now() - touchActiveAt.current < TOUCH_GUARD_MS) return;
      schedulePopover({ x: e.clientX, y: e.clientY });
    },
    [onIntent, ticker, schedulePopover],
  );

  const onMouseLeave = useCallback(() => {
    cancelIntent();
    clearPeekTimer();
    actions?.hidePopover();
  }, [cancelIntent, clearPeekTimer, actions]);

  const onFocus = useCallback(
    (e: React.FocusEvent) => {
      onIntent(ticker);
      if (Date.now() - touchActiveAt.current < TOUCH_GUARD_MS) return;
      // 커서 없는 키보드 포커스 — 행 좌측 근처를 앵커로.
      const rect = e.currentTarget.getBoundingClientRect();
      schedulePopover({
        x: rect.left + FOCUS_ANCHOR_INSET,
        y: rect.top + rect.height / 2,
      });
    },
    [onIntent, ticker, schedulePopover],
  );

  const onBlur = useCallback(() => {
    cancelIntent();
    clearPeekTimer();
    actions?.hidePopover();
  }, [cancelIntent, clearPeekTimer, actions]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      touchActiveAt.current = Date.now();
      suppressClick.current = false;
      const t = e.touches[0];
      touchStart.current = t ? { x: t.clientX, y: t.clientY } : null;
      clearLongPress();
      if (!actions) return;
      longPressTimer.current = setTimeout(() => {
        suppressClick.current = true;
        actions.openSheet({ ticker, name, seed });
      }, LONG_PRESS_MS);
    },
    [actions, ticker, name, seed, clearLongPress],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      touchActiveAt.current = Date.now();
      const start = touchStart.current;
      const t = e.touches[0];
      if (!start || !t) return;
      // 손가락이 임계 이상 움직이면 스크롤/드래그 → 롱프레스 취소.
      if (
        Math.abs(t.clientX - start.x) > MOVE_TOLERANCE ||
        Math.abs(t.clientY - start.y) > MOVE_TOLERANCE
      ) {
        clearLongPress();
      }
    },
    [clearLongPress],
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      touchActiveAt.current = Date.now();
      clearLongPress();
      // 롱프레스로 시트를 열었으면 이어지는 유령 클릭(내비게이션)을 취소.
      if (suppressClick.current) e.preventDefault();
    },
    [clearLongPress],
  );

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    // touch 롱프레스가 네이티브 컨텍스트 메뉴를 띄우지 않게(데스크탑 우클릭은 유지).
    if (Date.now() - touchActiveAt.current < TOUCH_GUARD_MS) e.preventDefault();
  }, []);

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    // touchend preventDefault 가 유령 클릭을 못 막은 환경 대비 belt-and-suspenders.
    if (suppressClick.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClick.current = false;
    }
  }, []);

  // 언마운트 — 대기 타이머 정리.
  useEffect(() => {
    return () => {
      clearPeekTimer();
      clearLongPress();
    };
  }, [clearPeekTimer, clearLongPress]);

  return {
    peekProps: {
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onContextMenu,
      onClickCapture,
    },
    prefetch,
  };
}
