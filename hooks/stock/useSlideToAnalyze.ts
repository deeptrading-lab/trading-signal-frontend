/**
 * useSlideToAnalyze — "밀어서 분석 시작" 슬라이드 스위치의 제스처·상태 로직 캡슐화.
 *
 * frontend.md 커스텀훅 의무에 따라 드래그 진행도·임계(85%)·commit·키보드/클릭 핸들러를
 * 컴포넌트(SlideToAnalyze)에서 분리한다. 세 입력 경로(드래그·클릭·키보드)는 모두
 * 동일하게 `onStart(provider)` 를 호출한다(슬라이드는 마우스/터치 한정 시각 향상).
 *
 * 반응형 JS 분기는 `useBreakpoint` 만 사용한다(`window.innerWidth`·`matchMedia` 직접 호출 금지).
 *
 * 상태 머신(스펙 §Components):
 *   idle → dragging → threshold-reached → committing → (onStart)
 *   클릭/키보드 → committing → (onStart)   ·   loading/disabled = 비활성
 *
 * prefers-reduced-motion 이면 committing 모션을 생략하고 즉시 onStart 한다.
 */

"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { animate, useMotionValue, useReducedMotion } from "motion/react";
import { useBreakpoint } from "@/hooks/utils/useBreakpoint";
import type { AIAnalysisProvider } from "@/lib/types/stock/aiAnalysis";

/** 슬라이드 컨트롤 비주얼 상태(스펙 §Components 1:1). */
export type SlidePhase =
  | "idle"
  | "dragging"
  | "threshold-reached"
  | "committing"
  | "disabled";

/** 임계 비율(스펙 R3) — 트랙 폭의 85% 이상 밀면 commit. */
const THRESHOLD = 0.85;
/** committing 스냅 스프링(기존 패널 모션값 정합). */
const SNAP_SPRING = { type: "spring" as const, damping: 25, stiffness: 200 };

interface UseSlideToAnalyzeArgs {
  /** 현재 선택된 provider — onStart 에 전달. */
  provider: AIAnalysisProvider;
  /** 세 입력 경로 공통 실행 콜백. */
  onStart: (provider: AIAnalysisProvider) => void;
  /** true 면 컨트롤 비활성(가용 0개·조회 중). */
  disabled?: boolean;
}

interface UseSlideToAnalyzeReturn {
  /** 현재 상태 머신 단계. */
  phase: SlidePhase;
  /** 노브 translateX 모션값(px). 트랙·노브 ref 측정 기반. */
  knobX: ReturnType<typeof useMotionValue<number>>;
  /** 0~1 진행도 모션값(트랙 채움/힌트 페이드 바인딩용). */
  progress: ReturnType<typeof useMotionValue<number>>;
  /** committing/loading 동안 true. */
  isBusy: boolean;
  /** reduced-motion 사용자 여부(시각 분기용). */
  reducedMotion: boolean;
  /** 트랙 컨테이너 ref(드래그 범위 측정) — 컨트롤 본체 button 에 부착. */
  trackRef: React.RefObject<HTMLButtonElement | null>;
  /** 노브 ref(폭 측정) — 노브 엘리먼트에 부착. */
  knobRef: React.RefObject<HTMLElement | null>;
  /** 컨트롤 본체(button)에 펼칠 핸들러 묶음. */
  handlers: {
    onPointerDown: (e: ReactPointerEvent) => void;
    onPointerMove: (e: ReactPointerEvent) => void;
    onPointerUp: (e: ReactPointerEvent) => void;
    onPointerCancel: (e: ReactPointerEvent) => void;
    onClick: () => void;
    onKeyDown: (e: ReactKeyboardEvent) => void;
  };
}

/** 가벼운 햅틱 1회(지원 시) — 임계/commit 피드백. */
function vibrate(ms: number): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(ms);
  }
}

export function useSlideToAnalyze({
  provider,
  onStart,
  disabled = false,
}: UseSlideToAnalyzeArgs): UseSlideToAnalyzeReturn {
  const { isMobile } = useBreakpoint();
  const reducedMotion = useReducedMotion() ?? false;

  const trackRef = useRef<HTMLButtonElement | null>(null);
  const knobRef = useRef<HTMLElement | null>(null);

  const knobX = useMotionValue(0);
  const progress = useMotionValue(0);

  const [phase, setPhase] = useState<SlidePhase>(disabled ? "disabled" : "idle");
  // 임계 진입 시 1회만 햅틱을 울리기 위한 가드.
  const passedThresholdRef = useRef(false);
  // 드래그 활성 여부(pointer capture 사이의 move 필터).
  const draggingRef = useRef(false);
  // commit 중복 호출 방지.
  const committedRef = useRef(false);
  // 실제 드래그 이동이 있었는지 — pointerup 직후 합성 click 의 commit 억제용.
  const movedRef = useRef(false);
  const startXRef = useRef(0);

  // disabled 토글 시 상태/모션 리셋.
  useEffect(() => {
    if (disabled) {
      setPhase("disabled");
      knobX.set(0);
      progress.set(0);
      passedThresholdRef.current = false;
      draggingRef.current = false;
      return;
    }
    if (!committedRef.current) setPhase("idle");
  }, [disabled, knobX, progress]);

  /** 노브가 트랙 끝까지 이동 가능한 최대 거리(px). */
  const getMaxTravel = useCallback((): number => {
    const track = trackRef.current;
    const knob = knobRef.current;
    if (!track || !knob) return 0;
    // 트랙 좌우 패딩을 제외한 내부 가용 폭에서 노브 폭을 뺀 거리.
    const style = window.getComputedStyle(track);
    const padX =
      parseFloat(style.paddingLeft || "0") + parseFloat(style.paddingRight || "0");
    const inner = track.clientWidth - padX;
    return Math.max(0, inner - knob.offsetWidth);
  }, []);

  /** 세 경로 공통 — committing 모션 후(또는 즉시) onStart. */
  const commit = useCallback(() => {
    if (committedRef.current || disabled) return;
    committedRef.current = true;
    setPhase("committing");
    vibrate(15);

    const fire = () => onStart(provider);

    if (reducedMotion) {
      // 모션 생략 — 즉시 실행.
      fire();
      return;
    }
    // 끝까지 스냅 모션 후 실행 — onStart 가 라이브 뷰로 전환하며 이 컴포넌트를 언마운트.
    const max = getMaxTravel();
    progress.set(1);
    animate(knobX, max, { ...SNAP_SPRING, onComplete: fire });
  }, [disabled, onStart, provider, reducedMotion, getMaxTravel, knobX, progress]);

  /** 진행도 갱신 + 임계 판정. */
  const applyProgress = useCallback(
    (clientX: number, originX: number) => {
      const max = getMaxTravel();
      if (max <= 0) return;
      const next = Math.min(Math.max(clientX - originX, 0), max);
      knobX.set(next);
      const ratio = next / max;
      progress.set(ratio);
      if (ratio >= THRESHOLD) {
        if (!passedThresholdRef.current) {
          passedThresholdRef.current = true;
          vibrate(10);
        }
        setPhase("threshold-reached");
      } else {
        passedThresholdRef.current = false;
        setPhase("dragging");
      }
    },
    [getMaxTravel, knobX, progress],
  );

  // 드래그 원점(노브 좌표 - 시작 clientX) 추적.
  const dragOriginRef = useRef(0);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (disabled || committedRef.current) return;
      draggingRef.current = true;
      movedRef.current = false;
      startXRef.current = e.clientX;
      // 현재 노브 위치를 기준으로 원점 고정(idle=0 에서 시작).
      dragOriginRef.current = e.clientX - knobX.get();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setPhase("dragging");
    },
    [disabled, knobX],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!draggingRef.current || disabled || committedRef.current) return;
      // 4px 이상 움직였으면 "드래그 의도" — 이후 합성 click 의 commit 억제.
      if (Math.abs(e.clientX - startXRef.current) > 4) movedRef.current = true;
      applyProgress(e.clientX, dragOriginRef.current);
    },
    [applyProgress, disabled],
  );

  const endDrag = useCallback(
    (e: ReactPointerEvent) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      const max = getMaxTravel();
      const ratio = max > 0 ? knobX.get() / max : 0;
      if (ratio >= THRESHOLD) {
        commit();
        return;
      }
      // 임계 미달 — idle 로 스냅백.
      passedThresholdRef.current = false;
      setPhase("idle");
      if (reducedMotion) {
        knobX.set(0);
        progress.set(0);
      } else {
        animate(knobX, 0, SNAP_SPRING);
        animate(progress, 0, { duration: 0.2 });
      }
    },
    [commit, getMaxTravel, knobX, progress, reducedMotion],
  );

  const onClick = useCallback(() => {
    if (disabled || committedRef.current) return;
    // 실제 드래그(임계 미달 스냅백) 직후의 합성 click 은 무시 — 의도치 않은 시작 방지.
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    // 모바일 1차 동작은 드래그라 단순 탭으로 시작하지 않는다(오작동 방지).
    // PC = 클릭이 1차 동작이므로 그대로 commit. 키보드는 onKeyDown 별도 경로.
    if (isMobile) return;
    commit();
  }, [commit, disabled, isMobile]);

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      if (disabled || committedRef.current) return;
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        commit();
      }
    },
    [commit, disabled],
  );

  return {
    phase,
    knobX,
    progress,
    isBusy: phase === "committing",
    reducedMotion,
    trackRef,
    knobRef,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onClick,
      onKeyDown,
    },
  };
}
