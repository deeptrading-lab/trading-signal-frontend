"use client";

import { useEffect } from "react";

/**
 * 서비스워커 등록(클라이언트 전용, 렌더 출력 없음) — 루트 `app/layout.tsx` 에서 1회 마운트.
 * `public/sw.js`(no-op SW)를 등록해 Android Chrome 의 PWA 설치 가능 조건을 충족시킨다.
 * - 초기 로드 경쟁을 피하려 `load` 이후 등록.
 * - 등록 실패는 "설치 경험"에만 영향(앱 기능엔 무영향) → 조용히 무시.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* 설치 경험 한정 — 무시 */
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
