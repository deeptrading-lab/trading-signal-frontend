/**
 * Tailwind theme — DESIGN.md (`docs/design/design-tone-refinement.md`, v7) 의 토큰을
 * `tailwind.theme.json` 으로 export 한 결과를 그대로 흡수한다.
 * v7 는 v6 (polish-followups) 의 토큰 키 셋 완전 무수정 계승 + colors 11 키의 hex 값만 재조정.
 * 합성 토큰 46 키·typography 15·spacing 22·rounded 3·breakpoints 4 키 셋 전체 무회귀.
 *
 * 파이프라인:
 *   1) 디자이너가 DESIGN.md 의 토큰을 수정.
 *   2) `npm run design:sync` → `tailwind.theme.json` 갱신.
 *   3) `npm run build` → 본 config 가 JSON 을 import → Tailwind theme.extend 에 주입.
 *
 * 어댑터(`adaptDesignTokens`) 의 책임:
 *   - DESIGN.md 의 `typography.<name>.lineHeight` / `fontFeature` / `letterSpacing` 는
 *     export 도구가 fontSize 튜플에 포함시키지 않거나 가공이 필요하므로 본 어댑터에서 흡수.
 *   - v4 신규 typography 2 키 (`nav-brand`, `sidebar-section`) 의 letterSpacing 도 본 어댑터에서 흡수.
 *   - v5 신규 typography 3 키 (`button-sm`, `label-sm`, `input-suffix`) 의 lineHeight + fontFeature 흡수.
 *   - 그 외 colors / spacing / borderRadius / fontFamily / fontSize / fontWeight 는
 *     theme.json 의 키 구조가 Tailwind 와 1:1 정합하므로 spread 만으로 충분.
 *   - v4 spacing 4 키 (`navbar-h`, `sidebar-w`, `drawer-w`, `main-max-w`) 는
 *     spacing 그대로 흡수되어 `w-navbar-h`, `w-sidebar-w` 등으로 호출.
 *   - v5 spacing 9 키 (`input-h`, `input-px`, `input-py`, `input-pr-suffix`,
 *     `dropdown-item-h`, `dropdown-item-py`, `button-primary-h`, `button-sm-h`, `hit-area-min`)
 *     도 spacing 으로 흡수되어 `h-input-h`, `pr-input-pr-suffix` 등으로 호출.
 *   - v6 spacing 3 키 (`input-pr-suffix-sm` 36px / `-md` 44px / `-lg` 56px) 추가 흡수 —
 *     `pr-input-pr-suffix-sm/md/lg` 클래스가 자동 생성되어 InputPanel 의 단위별 분기에서 호출.
 *   - v4 rounded 1 키 (`md`) 도 borderRadius spread 로 흡수.
 */

import type { Config } from "tailwindcss";
import themeJson from "./tailwind.theme.json";

// DESIGN.md 의 typography 토큰을 직접 옮겨둔다 (export 도구가 lineHeight / fontFeature 를 누락하므로 보완).
// v4 신규 키 `nav-brand`, `sidebar-section` 도 함께 등록.
// v5 신규 키 `button-sm`, `label-sm`, `input-suffix` 도 함께 등록.
const TYPOGRAPHY_EXTRAS: Record<
  string,
  { lineHeight: string; fontFeature?: string; letterSpacing?: string }
> = {
  display: { lineHeight: "1.18" },
  h1: { lineHeight: "1.2" },
  h2: { lineHeight: "1.35" },
  "body-md": { lineHeight: "1.55" },
  "body-sm": { lineHeight: "1.5" },
  "body-strong": { lineHeight: "1.5" },
  caption: { lineHeight: "1.4" },
  button: { lineHeight: "1.2" },
  "button-sm": { lineHeight: "1.2" },
  badge: { lineHeight: "1.2" },
  "mono-numeric": { lineHeight: "1.2", fontFeature: '"tnum"' },
  "nav-brand": { lineHeight: "1.2", letterSpacing: "-0.01em" },
  "sidebar-section": { lineHeight: "1.2", letterSpacing: "0.04em" },
  "label-sm": { lineHeight: "1.25" },
  "input-suffix": { lineHeight: "1.2", fontFeature: '"tnum"' },
};

type RawFontSizeEntry = [
  string,
  { fontWeight?: string; letterSpacing?: string },
];
type AdaptedFontSizeEntry = [
  string,
  {
    lineHeight: string;
    fontWeight?: string;
    fontFeatureSettings?: string;
    letterSpacing?: string;
  },
];

function adaptFontSize(
  raw: Record<string, RawFontSizeEntry>,
): Record<string, AdaptedFontSizeEntry> {
  const out: Record<string, AdaptedFontSizeEntry> = {};
  for (const [name, entry] of Object.entries(raw)) {
    // `body-strong` 은 colors 토큰과 typography 토큰이 같은 이름을 공유한다 (DESIGN.md 결정).
    // Tailwind 의 `text-<name>` 유틸리티는 fontSize 와 color 둘을 모두 매핑하므로
    // 한쪽이 다른 쪽을 덮어쓰는 충돌이 발생한다. 색 의미를 우선 살리고, 타이포 의미는
    // `text-body-md font-bold` 조합으로 풀어 사용한다 (값이 동일 = 16px/700).
    if (name === "body-strong") continue;
    const [size, meta] = entry;
    const extras = TYPOGRAPHY_EXTRAS[name] ?? { lineHeight: "1.5" };
    // letterSpacing 은 design.md export 도구가 meta 에 넣어주기도 하고, 누락되기도 한다.
    // 양쪽 모두에서 안전하게 흡수 — export 우선, fallback 으로 TYPOGRAPHY_EXTRAS.
    const letterSpacing = meta?.letterSpacing ?? extras.letterSpacing;
    out[name] = [
      size,
      {
        lineHeight: extras.lineHeight,
        ...(meta?.fontWeight ? { fontWeight: meta.fontWeight } : {}),
        ...(extras.fontFeature
          ? { fontFeatureSettings: extras.fontFeature }
          : {}),
        ...(letterSpacing ? { letterSpacing } : {}),
      },
    ];
  }
  return out;
}

function adaptDesignTokens(json: typeof themeJson) {
  const t = json.theme.extend;
  return {
    colors: t.colors,
    spacing: t.spacing,
    borderRadius: t.borderRadius,
    fontFamily: t.fontFamily,
    fontSize: adaptFontSize(
      t.fontSize as unknown as Record<string, RawFontSizeEntry>,
    ),
    // breakpoints — DESIGN.md `breakpoints` 토큰을 `screens` 로 흡수. `npm run design:sync`
    // 후처리(`scripts/inject-breakpoints.mjs`)가 `tailwind.theme.json.theme.extend.screens` 로 주입한다.
    // Tailwind 의 `theme.extend.screens` 는 기본 sm/md/lg/xl 위에 덮어쓰는 의미라서, 기본값과 동일하더라도
    // 명시적으로 흡수해 DESIGN.md 단일 진실 원천 규칙(PR #13)을 breakpoint 차원에도 일관 적용한다.
    screens: t.screens,
    // 컴포넌트 metric (input/button/badge height, shell padding) 은 spacing 토큰으로 합성 불가능한
    // 절대값이라 그대로 width/height 유틸리티에서 임의 값(`h-[42px]`)으로 쓰거나 컴포넌트 클래스에 흡수한다.
    // 차후 디자이너가 metric 토큰을 정식화하면 본 어댑터에서 흡수.
  } satisfies NonNullable<Config["theme"]>["extend"];
}

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: adaptDesignTokens(themeJson),
  },
  plugins: [],
};

export default config;
