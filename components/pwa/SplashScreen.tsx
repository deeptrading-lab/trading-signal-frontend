"use client";

import { useEffect, useState } from "react";
import { BrandPulseIcon } from "@/components/layout/BrandPulseIcon";
import { NAV_BRAND_LABEL } from "@/lib/copy/layout/navCopy";
import { cn } from "@/lib/utils/cn";

/**
 * PWA 인앱 스플래시 — 앱 부팅(콜드 로드) 직후 풀스크린 흰 화면에 **그래프 글리프 + "FinSight"
 * 워드마크**(사이드바 brand 와 동일 톤)를 띄우고, 로드 완료 시 fade-out 후 DOM 에서 제거한다.
 *
 * 왜 필요한가:
 *   - Android 네이티브 스플래시(manifest 자동 생성)는 **아이콘만** 띄울 수 있어 텍스트가 없다.
 *   - iOS 는 startupImage 가 없으면 기본 빈 흰 화면.
 *   본 컴포넌트가 두 경우 모두를 **흰 배경 + 글리프 + 워드마크**로 이어받아, 사용자에겐
 *   "로고 아래 FinSight 텍스트가 나타나는" 하나의 연속 화면으로 보인다.
 *
 * 중복(2회) 방지: 배경(#ffffff = manifest background_color)·글리프를 네이티브 스플래시와 맞춰
 *   로고가 점프/번쩍이지 않게 한다(`.splash-screen` 토큰).
 *
 * 표시/제거:
 *   - SSR 초기 상태가 `보임` 이므로 하이드레이션 이전에도 즉시 렌더(콜드 로드 흰 화면 공백 제거).
 *   - **최소 표시시간(1.2s)** 과 `load` 를 **둘 다** 충족해야 fade-out — 캐시된 PWA 에서 너무 빨리
 *     사라져 안 보이던 문제 해결(콜드 로드 시 로고+FinSight 를 명확히 인지할 시간 확보).
 *   - load 지연/실패 대비 4s 하드 백스톱.
 *   - opacity transition 종료 후 언마운트(`gone`).
 *   - 클라이언트 SPA 네비게이션 시엔 레이아웃이 유지돼 재등장하지 않음(콜드 로드 1회 한정).
 *
 * 로고 수직 정렬(네이티브 매칭):
 *   네이티브 스플래시는 로고를 **화면 전체 중앙**에 둔다. Android(예: One UI)는 상태바가 별도 띠라
 *   `env(safe-area-inset-top)=0` 이고 web 뷰포트가 그 아래서 시작 → `fixed inset-0` 중앙이 화면
 *   전체 중앙보다 아래에 찍혀 로고가 살짝 내려와 보인다(기기 실측 확인).
 *   정확한 보정은 `(상단상태바 − 하단제스처)/2` 인데, web 에선 둘을 못 가른다(`screen.height-innerHeight`
 *   는 상단+하단 **합**). 합의 절반(/2)은 과보정(로고가 살짝 위로)으로 실측 확인됨 → **chrome 합의
 *   1/4** 가 0(살짝 아래)과 1/2(살짝 위)의 경험적 중간(sweet spot)이라 이를 채택.
 *   iOS 는 viewport-fit=cover 로 innerHeight≈screen.height → 보정≈0(무영향).
 *   하단 고정바가 innerHeight 를 깎는 기기(availHeight<height)에선 과보정 위험 → 0(미보정).
 */
const MIN_VISIBLE_MS = 1200; // 최소 표시시간 — 네이티브 스플래시 직후 인앱이 또렷이 보일 시간
const BACKSTOP_MS = 4000; // load 미발화 대비 하드 상한
const MAX_CHROME_PX = 120; // 상·하 chrome 합 추정 상한(이상치 과보정 가드)
const LIFT_RATIO = 0.25; // chrome 합 대비 위쪽 보정 비율(0=살짝아래 / 0.5=살짝위 의 중간)

/** 로고를 화면 전체 중앙에 맞추기 위한 위쪽 보정량(px). 위 주석 참고. */
function measureLogoLift(): number {
  const chrome = window.screen.height - window.innerHeight; // 상단 상태바 + 하단 제스처 합
  const noPersistentBottomBar = window.screen.availHeight >= window.screen.height;
  if (noPersistentBottomBar && chrome > 0 && chrome < MAX_CHROME_PX) {
    return Math.round(chrome * LIFT_RATIO);
  }
  return 0;
}

export function SplashScreen() {
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const [logoLiftPx, setLogoLiftPx] = useState(0);

  useEffect(() => {
    setLogoLiftPx(measureLogoLift());

    let loaded = document.readyState === "complete";
    let minElapsed = false;
    const leaveWhenReady = () => {
      if (loaded && minElapsed) setLeaving(true);
    };

    const minTimer = window.setTimeout(() => {
      minElapsed = true;
      leaveWhenReady();
    }, MIN_VISIBLE_MS);
    const onLoad = () => {
      loaded = true;
      leaveWhenReady();
    };
    if (!loaded) window.addEventListener("load", onLoad, { once: true });
    const backstop = window.setTimeout(() => setLeaving(true), BACKSTOP_MS);

    return () => {
      window.removeEventListener("load", onLoad);
      window.clearTimeout(minTimer);
      window.clearTimeout(backstop);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      className={cn("splash-screen", leaving && "splash-screen-leaving")}
      aria-hidden="true"
      onTransitionEnd={() => {
        if (leaving) setGone(true);
      }}
    >
      {/* 런타임 측정값(상태바/2)만큼 로고를 위로 올려 네이티브 화면-전체-중앙과 일치 — 동적 값이라 inline transform. */}
      <span
        className="splash-icon-wrap"
        style={logoLiftPx ? { transform: `translateY(-${logoLiftPx}px)` } : undefined}
      >
        <BrandPulseIcon className="splash-icon" gradientId="splashPulse" />
      </span>
      <span className="splash-wordmark">{NAV_BRAND_LABEL}</span>
    </div>
  );
}
