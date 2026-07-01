/**
 * useChartTheme — recharts 색·스타일을 런타임 테마(light/dark)에 맞춰 재계산하는 훅.
 *
 * 배경(다크모드 PRD §3.3): recharts 는 색을 **문자열 prop** 으로 받으므로 `bg-surface` 같은
 * Tailwind 클래스(= CSS 변수 자동 전환)가 통하지 않는다. 빌드타임 hex 를 고정 소비하던
 * `chartTheme.ts` 를 이 훅으로 대체해, `resolvedTheme` 변화 시 `getComputedStyle` 로
 * `--fs-*` 의 **실제 적용값(hex)** 을 런타임 read → 색 객체를 재생성한다.
 * 새 객체 reference 가 recharts 에 내려가 리렌더 → 차트 색이 즉시 갱신된다.
 *
 * 색 단일 출처: `app/theme-vars.css` 의 `:root` / `html.dark` 의 `--fs-*` (DESIGN.md → design:sync).
 * 두 팔레트를 코드에 하드코딩하면 SSOT 위반 → 기각. CSS 변수 한 곳만 읽는다.
 *
 * SSR / 첫 렌더 폴백: `getComputedStyle` 은 마운트 후에만 정확하다(useBreakpoint 패턴 동일).
 *   SSR·첫 페인트는 `tailwind.theme.json` 의 정적 light 값으로 폴백 → 마운트 후 useEffect 에서
 *   실제 계산값으로 swap. 차트는 client 전용("use client" 컴포넌트)이라 깜빡임 영향은 미미.
 *
 * rgba 직타(tooltipBg / border / boxShadow): 알파 채널이라 토큰화 불가(`--fs-*` 는 불투명 hex).
 *   `resolvedTheme` 분기로 light/dark 두 리터럴을 둔다. backdropFilter blur 는 공통 유지.
 */

"use client";

import { useEffect, useState } from "react";
import themeJson from "@/tailwind.theme.json";
import { useThemeStore, type ResolvedTheme } from "@/lib/store/themeStore";

/** 서브플롯 호버 연동용 syncId — 색 무관 상수(테마와 독립). */
export const SYNC_ID = "stock-chart";

/** chartTheme 토큰 → CSS 변수 키 매핑. 의미가 일치하는 기존 토큰은 재사용. */
const VAR_KEYS = {
  stroke: "signal-up", // 상승 캔들/라인 (한국식 빨강)
  fill: "signal-up",
  axisTick: "text-muted",
  grid: "border-line",
  tooltipText: "text-strong",
  macdLine: "chart-macd", // MACD 라인 (파랑)
  signalLine: "chart-signal", // MACD 시그널 라인 (앰버)
  histUp: "chart-hist-up", // MACD 히스토그램 양수 (초록)
  histDown: "chart-hist-down", // MACD 히스토그램 음수 (빨강)
  rsiLine: "chart-rsi", // RSI 라인 (보라)
  refOB: "chart-ref-ob", // RSI 과매수 70
  refOS: "chart-ref-os", // RSI 과매도 30
  refMid: "chart-ref-mid", // RSI 중립 50
  volUp: "chart-vol-up", // 거래량 상승 봉
  volDown: "chart-vol-down", // 거래량 하락 봉
  down: "chart-down", // 하락 캔들/라인 (파랑)
  bb: "chart-bb", // 볼린저밴드 상/하단·중심선·음영 (teal, 매물대 회색/보라와 구분)
  surface: "surface", // 차트 배경 — 최신가 태그 외곽선 녹아웃(겹친 요소와 경계 분리)
} as const;

type ColorKey = keyof typeof VAR_KEYS;
export type ChartColors = Record<ColorKey, string>;

/** tooltip 반투명 오버레이 — rgba 라 토큰화 제외(코드 리터럴, resolvedTheme 분기). */
const TOOLTIP_RGBA = {
  light: {
    bg: "rgba(255,255,255,0.82)",
    border: "1px solid rgba(15,20,25,0.08)",
    boxShadow: "0 4px 12px rgba(23,32,42,0.1)",
    divider: "1px solid rgba(15,20,25,0.06)", // CandleTooltip 등락 구분선
  },
  // dark: surface-elevated(#1d2630) 톤의 어두운 반투명 + 밝은 보더로 시인성 확보.
  dark: {
    bg: "rgba(29,38,48,0.85)",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.45)",
    divider: "1px solid rgba(255,255,255,0.08)",
  },
} as const;

export interface ChartTheme {
  C: ChartColors;
  tooltipStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  axisProps: {
    axisLine: false;
    tickLine: false;
    tick: { fontSize: number; fill: string };
  };
  /** CandleTooltip 등락 구분선(rgba) — resolvedTheme 분기 결과. */
  tooltipDivider: string;
}

/** 정적 light 폴백 — themeJson 의 hex(현 chartTheme.ts 방식). SSR/첫 렌더에서만 사용. */
function staticLightColors(): ChartColors {
  const t = themeJson.theme.extend.colors as Record<string, string>;
  const out = {} as ChartColors;
  for (const key in VAR_KEYS) {
    out[key as ColorKey] = t[VAR_KEYS[key as ColorKey]];
  }
  return out;
}

/** 마운트 후 — `getComputedStyle` 로 현재 적용된 `--fs-*` hex 를 런타임 read. */
function runtimeColors(): ChartColors {
  const cs = getComputedStyle(document.documentElement);
  const out = {} as ChartColors;
  for (const key in VAR_KEYS) {
    out[key as ColorKey] = cs.getPropertyValue(`--fs-${VAR_KEYS[key as ColorKey]}`).trim();
  }
  return out;
}

function buildTheme(C: ChartColors, resolved: ResolvedTheme): ChartTheme {
  const rgba = TOOLTIP_RGBA[resolved];
  return {
    C,
    tooltipStyle: {
      borderRadius: 8,
      border: rgba.border,
      boxShadow: rgba.boxShadow,
      backgroundColor: rgba.bg,
      backdropFilter: "blur(3px)",
      WebkitBackdropFilter: "blur(3px)",
      color: C.tooltipText,
      fontSize: 12,
    },
    labelStyle: { color: C.axisTick, marginBottom: 4 },
    axisProps: {
      axisLine: false,
      tickLine: false,
      tick: { fontSize: 11, fill: C.axisTick },
    },
    tooltipDivider: rgba.divider,
  };
}

export function useChartTheme(): ChartTheme {
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);

  // SSR / 첫 렌더 폴백 — 정적 light 값. 마운트 후 실제 계산값으로 swap.
  const [theme, setTheme] = useState<ChartTheme>(() =>
    buildTheme(staticLightColors(), "light"),
  );

  useEffect(() => {
    setTheme(buildTheme(runtimeColors(), resolvedTheme));
  }, [resolvedTheme]);

  return theme;
}
