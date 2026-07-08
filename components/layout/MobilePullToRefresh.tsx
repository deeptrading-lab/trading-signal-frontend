/**
 * MobilePullToRefresh — 모바일 셸 공통 "위→아래 드래그" 새로고침(pull-to-refresh).
 *
 * `(main)` 레이아웃의 스크롤 컨테이너(`<main>`)에 터치 리스너를 붙여, **최상단(scrollTop≈0)에서
 * 아래로 당기면** 스피너를 노출하고 임계치(THRESHOLD)를 넘겨 놓으면 TanStack Query 전체를
 * 무효화(=활성 쿼리 재요청)한다. 페이지별 "새로고침" 아이콘 버튼을 대체(모바일 한정) — PC(md+)는
 * 터치 제스처가 없어 각 페이지가 버튼을 유지한다.
 *
 * 구현 노트:
 *   - 데스크탑 마우스는 touch 이벤트를 발생시키지 않으므로 자동으로 무시된다(별도 브레이크포인트 게이트 불필요).
 *   - 리스너는 마운트 시 1회만 등록(가변 상태는 ref 로 읽어 gesture 중 재등록에 의한 이벤트 유실 방지).
 *   - 당기는 동안 `touchmove` 를 non-passive 로 preventDefault → iOS/안드로이드 네이티브 오버스크롤 바운스를
 *     막고 우리 인디케이터만 그린다(레이아웃의 `overscroll-y-contain` 과 함께). 콘텐츠 자체는 이동시키지 않음.
 *   - 인디케이터는 `md:hidden` + 헤더(navbar-h) 아래 고정. 시각 장식이라 `aria-hidden`.
 */

"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils/cn";

/** 새로고침 발동 임계 당김 거리(px, 감쇠 후). */
const THRESHOLD = 64;
/** 당김 거리 상한(px, 감쇠 후) — 러버밴드 느낌의 캡. */
const MAX_PULL = 96;
/** 손가락 이동 대비 인디케이터 이동 감쇠 계수(0.5 = 절반만 따라옴). */
const DAMPING = 0.5;

export function MobilePullToRefresh({
  scrollElRef,
}: {
  scrollElRef: RefObject<HTMLElement | null>;
}) {
  const queryClient = useQueryClient();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // gesture 중 읽는 가변 상태 — 리스너를 1회만 등록하기 위해 ref 로 미러링.
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const startYRef = useRef<number | null>(null);
  const activeRef = useRef(false);

  const applyPull = (v: number) => {
    pullRef.current = v;
    setPull(v);
  };

  useEffect(() => {
    const el = scrollElRef.current;
    if (!el) return;

    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      if (el.scrollTop > 0) return; // 최상단에서만 시작
      startYRef.current = e.touches[0]?.clientY ?? null;
      activeRef.current = true;
    };

    const onMove = (e: TouchEvent) => {
      if (!activeRef.current || startYRef.current == null) return;
      const dy = (e.touches[0]?.clientY ?? 0) - startYRef.current;
      if (dy <= 0) {
        // 위로 스크롤 의도 — 제스처 취소하고 정상 스크롤에 양보.
        activeRef.current = false;
        applyPull(0);
        return;
      }
      if (el.scrollTop > 0) {
        activeRef.current = false;
        applyPull(0);
        return;
      }
      // 최상단에서 아래로 당기는 중 — 네이티브 바운스 대신 우리가 인디케이터를 그린다.
      e.preventDefault();
      applyPull(Math.min(MAX_PULL, dy * DAMPING));
    };

    const onEnd = () => {
      if (!activeRef.current) return;
      activeRef.current = false;
      startYRef.current = null;
      if (pullRef.current >= THRESHOLD && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        applyPull(THRESHOLD);
        // 활성 쿼리 전량 재요청(현재 화면 데이터 새로고침).
        void queryClient
          .invalidateQueries()
          .finally(() => {
            refreshingRef.current = false;
            setRefreshing(false);
            applyPull(0);
          });
      } else {
        applyPull(0);
      }
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [scrollElRef, queryClient]);

  const visible = pull > 0 || refreshing;
  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed left-1/2 top-navbar-h z-40 -translate-x-1/2 md:hidden",
        "transition-opacity duration-150",
        visible ? "opacity-100" : "opacity-0",
      )}
      style={{ transform: `translate(-50%, ${Math.round(pull * 0.6)}px)` }}
    >
      <div className="mt-sm flex h-9 w-9 items-center justify-center rounded-full bg-surface-elevated shadow-card">
        <RefreshCw
          className={cn(
            "h-5 w-5 text-text-muted",
            refreshing && "animate-spin",
          )}
          style={
            refreshing
              ? undefined
              : { transform: `rotate(${Math.round(progress * 270)}deg)` }
          }
        />
      </div>
    </div>
  );
}
