"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePrefetchStockDetail } from "@/hooks/stock/usePrefetchStockDetail";
import { preloadPeekChunk } from "@/components/stock/peekDynamic";
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
 * 내부에서 `usePrefetchStockDetail({ warmDailyChart: true })` 을 함께 소유해, 상세 선반입과
 * **똑같은 120ms 의도 지연**으로 Peek 을 띄운다(스쳐 지나가는 hover 는 미발화). 선반입이 데운
 * `stock.price` + **일봉 차트** 캐시를 Peek 의 `useQueryStockPrice`·`MiniStockChart` 가 그대로 히트하므로
 * 팝오버가 뜰 땐 차트 페치가 이미 끝나 있어 hover 후 1~2초 공백이 사라진다.
 *
 * ## 첫 hover 청크 워밍(마우스 기기·유휴 1회)
 * 팝오버/시트(→ recharts)는 지연 로드라 **첫 소환** 은 청크 다운로드를 기다린다. 마우스 기기
 * (`pointer: fine`)에서 유휴 시점에 `preloadPeekChunk()` 를 한 번 호출해 청크를 미리 데운다 —
 * 데이터 프리패치(위)와 합쳐 첫 peek 도 즉시 그린다. 터치 전용 기기는 hover peek 이 없어 워밍하지
 * 않는다(recharts 불필요 로드 방지). 모듈 가드로 세션당 1회만 스케줄(행이 다수라도 중복 없음).
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
 * onClickCapture 로 이중 차단한다. ♥/제거 등 인터랙티브 자식에서 시작한 touch 는 롱프레스 대상에서
 * 제외해(closest 가드) 버튼 고유 탭을 지킨다.
 *
 * ## 팝오버 잔류 방지
 * 팝오버는 pointer-events-none 라 클릭이 통과해도 스스로 닫히지 않는다. 라우트 이동 해제
 * (StockPeekProvider) 가 hover→클릭/Enter 내비게이션을 잡고, 여기 언마운트 정리가 검색결과 교체처럼
 * 내비게이션 없이 hover 중인 행이 사라지는 경우를 잡는다(이 행이 띄운 팝오버만 정확히 닫음).
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

/** 세션당 1회 청크 워밍 가드 — Peek 행이 다수라도 preload 를 한 번만 스케줄한다. */
let peekChunkWarmScheduled = false;

/** 마우스 기기 유휴 시점에 Peek 청크(→ recharts)를 1회 미리 로드(터치 전용 기기는 skip). */
function schedulePeekChunkWarm(): void {
  if (peekChunkWarmScheduled || typeof window === "undefined") return;
  // hover peek 이 없는 터치 전용 기기는 recharts 를 미리 받지 않는다.
  if (!window.matchMedia?.("(pointer: fine)").matches) return;
  peekChunkWarmScheduled = true;
  const ric = window.requestIdleCallback;
  if (typeof ric === "function") ric(() => preloadPeekChunk(), { timeout: 2000 });
  else window.setTimeout(() => preloadPeekChunk(), 800);
}

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
  const { prefetch, onIntent, cancelIntent } = usePrefetchStockDetail({
    warmDailyChart: true,
  });

  // 마우스 기기 유휴 시점에 Peek 청크를 1회 미리 로드(첫 hover 청크 지연 흡수). 모듈 가드로 세션당 1회.
  useEffect(() => {
    schedulePeekChunkWarm();
  }, []);

  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  /** 마지막 touch 상호작용 시각(ms) — 합성 mouseenter 억제(타임스탬프 자동 만료, 리크 없음). */
  const touchActiveAt = useRef(0);
  /** 롱프레스로 시트를 열었음 — 이어지는 클릭(내비게이션)을 삼킨다. */
  const suppressClick = useRef(false);
  /** 이 행이 지금 팝오버를 띄운 상태인지 — leave/언마운트 시 자기 팝오버만 정확히 닫기 위해. */
  const shownPopover = useRef(false);

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
        shownPopover.current = true;
        actions.showPopover({ ticker, name, anchor, seed });
      }, PEEK_INTENT_MS);
    },
    [actions, ticker, name, seed, clearPeekTimer],
  );

  /** 이 행이 띄운 팝오버만 닫는다 — 대기 타이머 취소 + shown 이면 hide(교차 행 오작동 방지). */
  const hideOwnPopover = useCallback(() => {
    clearPeekTimer();
    if (shownPopover.current) {
      shownPopover.current = false;
      actions?.hidePopover();
    }
  }, [clearPeekTimer, actions]);

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
    hideOwnPopover();
  }, [cancelIntent, hideOwnPopover]);

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
    hideOwnPopover();
  }, [cancelIntent, hideOwnPopover]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      touchActiveAt.current = Date.now();
      suppressClick.current = false; // 새 touch — 이전 억제 상태 해제(자식 버튼 탭도 포함).
      clearLongPress(); // 이전 대기 타이머 취소.
      // ♥/제거 등 "자식" 인터랙티브 요소에서 시작한 touch 는 롱프레스 제외(버튼 고유 탭 유지).
      //   단, 행 자체가 버튼인 검색결과(currentTarget===button)는 제외 대상이 아니다 → 롱프레스 허용.
      const interactive = (e.target as HTMLElement | null)?.closest?.("button, a");
      if (interactive && interactive !== e.currentTarget) {
        touchStart.current = null;
        return;
      }
      const t = e.touches[0];
      touchStart.current = t ? { x: t.clientX, y: t.clientY } : null;
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

  // 언마운트 — 대기 타이머 정리 + 이 행이 띄운 팝오버가 남아 있으면 닫는다.
  //   React 는 언마운트 시 onMouseLeave/onBlur 를 쏘지 않는다. 검색결과 교체처럼 hover 중인 행이
  //   내비게이션 없이 사라지는 경우(라우트 해제가 못 잡음) 팝오버가 떠 있는 채로 남는 것을 방지.
  useEffect(() => {
    return () => {
      clearPeekTimer();
      clearLongPress();
      if (shownPopover.current) actions?.hidePopover();
    };
  }, [clearPeekTimer, clearLongPress, actions]);

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
