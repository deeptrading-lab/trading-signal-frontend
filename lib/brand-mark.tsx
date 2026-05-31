import type { ReactElement } from "react";

/**
 * FinSight 브랜드 마크 — `next/og` ImageResponse 로 굽는 아이콘류(iOS 홈 아이콘 `app/apple-icon.tsx`,
 * PWA manifest 아이콘 `app/icon-pwa`) 의 단일 시각 소스.
 * - 시각: **흰 배경** + lucide `Activity` 글리프(3색 맥박 그라데이션). 사이드바/헤더 brand badge
 *   (`components/layout/BrandPulseIcon`) · 파비콘(`app/icon.tsx`) · OG(`app/opengraph-image.tsx`) 과 정합.
 *   (사용자 신규 로고 — 흰 배지 기반. 가운데를 슬레이트그레이로 둬 밝은 배경에서도 라인이 보인다.)
 * - `ImageResponse` 내부에서는 Tailwind 토큰 직접 호출 불가 → hex 명시(디자인 토큰 직타의 합리적
 *   예외 — 토큰 동기화 시 본 상수도 갱신).
 */
export const BRAND_MARK_BG = "#ffffff";

/**
 * 맥박 라인 3색 그라데이션 — 한국 시세 색 관례. **상승(정점)=빨강 / 가운데=슬레이트그레이 / 하락(저점)=파랑**.
 * 파비콘·OG·홈 아이콘·사이드바·헤더 로고가 공유하는 **단일 색 소스**(여기만 고치면 전부 반영).
 * 가운데를 흰색이 아닌 슬레이트그레이로 둬, 흰 배지 위에서도 라인이 또렷하다(사용자 신규 로고 규격).
 */
export const PULSE_UP = "#ef4444";
export const PULSE_MID = "#94a3b8";
export const PULSE_DOWN = "#3b82f6";

/** lucide-react `Activity` 글리프 좌표 — 모든 브랜드 마크 공유. */
export const PULSE_POLYLINE_POINTS = "22 12 18 12 15 21 9 3 6 12 2 12";

/**
 * 맥박 라인용 세로 linearGradient 정의(`<defs>`)를 **반환하는 함수**. viewBox `0 0 24 24` 기준
 * 정점 y=3 → 저점 y=21 매핑. polyline 에서 `stroke={`url(#${id})`}` 로 참조. id 는 한 문서 내
 * 유일해야 하므로 호출부가 지정한다.
 *
 * ⚠️ **컴포넌트(`<X/>`)가 아니라 함수 호출(`{pulseGradientDefs(id)}`)로 써야 한다.**
 *    Satori(next/og)는 중첩된 커스텀 컴포넌트를 invoke 하지 않아 `<defs>` 가 누락 → 그라데이션이
 *    그려지지 않는다(아이콘이 단색 배경만 남음). 함수로 즉시 호출하면 트리에 `<defs>` 리터럴이
 *    들어가 Satori·브라우저 DOM 양쪽에서 정상 동작.
 */
export function pulseGradientDefs(id: string): ReactElement {
  return (
    <defs>
      <linearGradient
        id={id}
        gradientUnits="userSpaceOnUse"
        x1="0"
        y1="3"
        x2="0"
        y2="21"
      >
        <stop offset="0%" stopColor={PULSE_UP} />
        <stop offset="50%" stopColor={PULSE_MID} />
        <stop offset="100%" stopColor={PULSE_DOWN} />
      </linearGradient>
    </defs>
  );
}

/**
 * 브랜드 마크 엘리먼트. 캔버스 크기는 호출부 `ImageResponse(..., { width, height })` 가 결정하고,
 * 본 함수는 그 안을 100% 채운다. `size` 는 글리프 비율 계산에만 사용.
 * @param size  캔버스 한 변 px (글리프를 ~55% 로 — maskable safe-zone[중앙 80%] 안에 안전)
 * @param radius 배경 모서리 둥글기 px. 기본 0 = full-bleed(iOS squircle / Android maskable 가 자체 마스킹)
 */
export function brandMark(size: number, radius = 0): ReactElement {
  const glyph = Math.round(size * 0.55);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND_MARK_BG,
        borderRadius: radius,
      }}
    >
      <svg
        width={glyph}
        height={glyph}
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {pulseGradientDefs("brandMarkPulse")}
        {/* lucide-react Activity icon path (3색 맥박 그라데이션 stroke) */}
        <polyline points={PULSE_POLYLINE_POINTS} stroke="url(#brandMarkPulse)" />
      </svg>
    </div>
  );
}
