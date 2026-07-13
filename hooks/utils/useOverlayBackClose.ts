"use client";

/**
 * useOverlayBackClose — 모바일 뒤로가기(하드웨어 버튼·스와이프)가 **오버레이만 닫도록** 히스토리 연동.
 *
 * 문제(overlay-back-close, #361 AI 패널에서 시작): 풀스크린 오버레이(패널·시트·모달)가 브라우저
 * 히스토리에 얹혀 있지 않으면, 모바일 뒤로가기가 오버레이 대신 **라우트를 뒤로** 보내 페이지를
 * 이탈한다. 이 훅은 오버레이가 열릴 때 marker 엔트리를 1개 push 해 두고:
 *   - popstate(뒤로가기) → `onClose()` 만 호출(라우트 유지)
 *   - UI 닫기(X·배경 클릭·Escape → unmount 또는 open=false) → `history.back()` 으로 marker 를
 *     소비해 히스토리 잔여를 없앤다(다음 뒤로가기는 정상적으로 이전 페이지).
 *   - 라우트 이동으로 닫힘 → 현재 엔트리가 marker 가 아니므로 back() 없이 정리만(이탈 방지).
 * 데스크탑은 무장하지 않아 기존 동작 유지(뒤로가기=페이지 이동). 판별은 `useBreakpoint`.
 *
 * 사용:
 *   - 항상 마운트 + open prop 형: `useOverlayBackClose(isOpen, close)` (AI 분석 패널)
 *   - 열릴 때만 마운트 형:       `useOverlayBackClose(true, onClose)` (시트·모달)
 *
 * 설계 노트:
 *   - **중첩 오버레이**: 모듈 스택으로 최근 marker 만 popstate 에 응답(아래 오버레이는 유지).
 *     같은 popstate 에 여러 인스턴스가 반응하지 않도록 이벤트 단위 dedupe(WeakSet).
 *   - **StrictMode 이중 마운트**: 소비(back)는 다음 tick 으로 예약하고, 곧바로 재마운트한
 *     인스턴스가 같은 marker 를 **재사용(adopt)** 하며 예약을 취소한다 — dev 에서 marker 가
 *     중복 push 되거나 열자마자 닫히는 문제 없음.
 *   - **프로그래매틱 back 구분**: marker 소비용 back() 이 유발한 popstate 는 suppress 카운터로
 *     무시 — 중첩 시 아래 오버레이가 따라 닫히는 오동작 방지.
 */

import { useEffect, useRef } from "react";
import { useBreakpoint } from "@/hooks/utils/useBreakpoint";

/** history.state 에 심는 marker 키 — 이 키가 있으면 "오버레이 back-close 엔트리". */
const STATE_KEY = "overlayBackClose";

/** 무장된 marker id 스택(아래→위). 최상단만 popstate 에 응답한다. */
const overlayStack: string[] = [];
/** UI 닫기 후 소비 예약된 marker — StrictMode 재마운트가 취소(재사용)할 수 있다. */
const pendingConsume = new Set<string>();
/** 같은 popstate 이벤트에 여러 훅 인스턴스가 응답하지 않도록 이벤트 단위 dedupe. */
const handledPops = new WeakSet<PopStateEvent>();
/** marker 소비용 프로그래매틱 back() 횟수 — 그만큼의 popstate 는 사용자 뒤로가기가 아니므로 무시. */
let suppressPops = 0;
let seq = 0;

function removeFromStack(id: string): void {
  const idx = overlayStack.indexOf(id);
  if (idx !== -1) overlayStack.splice(idx, 1);
}

export function useOverlayBackClose(open: boolean, onClose: () => void): void {
  const { isMobile } = useBreakpoint();
  const isMobileRef = useRef(isMobile);
  useEffect(() => {
    isMobileRef.current = isMobile;
  }, [isMobile]);
  // 최신 onClose 참조 — 콜백 identity 변화가 effect 를 재실행(marker 재발급)하지 않게 ref 경유.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open || !isMobileRef.current) return;
    if (typeof window === "undefined") return;

    // 무장 — StrictMode 재마운트면 직전 인스턴스가 소비 예약한 marker 를 재사용(adopt).
    let id: string;
    const current = window.history.state?.[STATE_KEY];
    if (
      typeof current === "string" &&
      pendingConsume.has(current) &&
      overlayStack[overlayStack.length - 1] === current
    ) {
      id = current;
      pendingConsume.delete(id); // 예약 취소 = 그대로 이어받음.
    } else {
      id = `ovl-${++seq}`;
      window.history.pushState({ [STATE_KEY]: id }, "");
      overlayStack.push(id);
    }

    // 뒤로가기 — 최상단 marker 소유자만 닫는다(중첩 시 아래 오버레이 유지).
    let poppedByBack = false;
    const onPop = (e: PopStateEvent) => {
      if (suppressPops > 0) {
        // marker 소비용 back() 이 유발한 popstate — 사용자 입력 아님. 첫 수신자만 차감.
        if (!handledPops.has(e)) {
          handledPops.add(e);
          suppressPops--;
        }
        return;
      }
      if (handledPops.has(e)) return;
      if (overlayStack[overlayStack.length - 1] !== id) return;
      handledPops.add(e);
      overlayStack.pop();
      poppedByBack = true;
      onCloseRef.current();
    };
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("popstate", onPop);
      if (poppedByBack) return; // 뒤로가기로 닫힘 — marker 이미 소비됨.
      // UI 닫기/unmount — 소비를 다음 tick 으로 예약. StrictMode 재마운트는 adopt 로 취소한다.
      pendingConsume.add(id);
      setTimeout(() => {
        if (!pendingConsume.has(id)) return; // 재마운트가 이어받음.
        pendingConsume.delete(id);
        removeFromStack(id);
        // 현재 엔트리가 내 marker 일 때만 소비 — 라우트 이동으로 닫힌 경우(다른 엔트리 위)는
        // back() 하면 페이지가 이동해 버리므로 정리만 한다(잔여 marker 는 같은 URL 이라 무해).
        if (window.history.state?.[STATE_KEY] === id) {
          suppressPops++;
          window.history.back();
        }
      }, 0);
    };
  }, [open]);
}
