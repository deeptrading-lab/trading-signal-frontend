/**
 * Tailwind theme — DESIGN.md (`docs/design/finsight-redesign.md`, v8) 의 토큰을
 * `tailwind.theme.json` 으로 export 한 결과를 그대로 흡수한다.
 * v8 = v7-rev2 의 토큰 키 셋 무수정 계승 + (a) 한국식 등락 의미 토큰 (signal-up / signal-down + soft 페어)
 * + (b) 자산 식별 토큰 (asset-stock / asset-coin + soft 페어) + (c) AI 그라데이션 토큰 + (d) Pretendard 폰트
 * + (e) 카드 셸 lg/xl 라운드 + (f) 카드 padding/hero 토큰 + (g) font-display 신규 typography.
 * 합성 토큰 61 키·typography 17·spacing 29·rounded 5·breakpoints 4 키 셋 전체.
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
 *
 * home-market-redesign v9 (PR1) 토큰 주입 — `package.json` 의 `design:sync` 는 source 가
 * `docs/design/finsight-redesign.md` 로 고정돼 있어 v9 신규 토큰을 자동 export 하지 못한다.
 * 회귀 없는 경로로 **PR1 에 필요한 토큰만** `tailwind.theme.json` 에 직접 병합했다 (finsight 기존
 * 토큰 hex·사이즈 무변경):
 *   - spacing: `donut-size`(168px) / `donut-thickness`(22px) / `table-row-h`(48px) / `table-cell-px`(12px)
 *   - typography: `table-cell-numeric`(14px / 700 / tnum) — 위 TYPOGRAPHY_EXTRAS 에 lineHeight/tnum 등록
 * 마이페이지 자산 섹션 합성 토큰(`asset-hero`/`holdings-table-*`/도넛)은 기존 색만 참조하므로
 * `app/components.css` 의 `@layer components` 로 흡수(색 신규 0). 공포·탐욕(`fng-*`)·공시·검색·nav
 * 준비중 토큰은 PR2 영역이라 본 PR 에서 주입하지 않는다.
 */

import type { Config } from "tailwindcss";
import themeJson from "./tailwind.theme.json";

// DESIGN.md 의 typography 토큰을 직접 옮겨둔다 (export 도구가 lineHeight / fontFeature 를 누락하므로 보완).
// v4 신규 키 `nav-brand`, `sidebar-section` 도 함께 등록.
// v5 신규 키 `button-sm`, `label-sm`, `input-suffix` 도 함께 등록.
// v8 신규 키 `font-display` 도 함께 등록 (36px / 800 / lineHeight 1.12 / letterSpacing -0.02em).
const TYPOGRAPHY_EXTRAS: Record<
  string,
  { lineHeight: string; fontFeature?: string; letterSpacing?: string }
> = {
  display: { lineHeight: "1.18" },
  "font-display": { lineHeight: "1.12", letterSpacing: "-0.02em" },
  h1: { lineHeight: "1.2" },
  h2: { lineHeight: "1.35" },
  "body-md": { lineHeight: "1.55" },
  "body-sm": { lineHeight: "1.5" },
  "body-sm-strong": { lineHeight: "1.35" },
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
  // home-market-redesign v9 (PR1) — 보유종목 테이블 숫자 셀 (14px / 700 / tnum).
  "table-cell-numeric": { lineHeight: "1.3", fontFeature: '"tnum"' },
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

/**
 * colors 맵을 hex 직타가 아닌 `var(--fs-<key>)` 참조로 전환한다 (다크모드 indirection).
 *
 * 빌드타임에 hex 를 `theme.extend.colors` 에 박으면 `html.dark` 토글로 색을 못 바꾼다.
 * 대신 utility 가 `var(--fs-surface)` 를 참조하고, 실제 hex 는 `app/theme-vars.css`
 * (`:root` light / `html.dark` dark) 가 선언한다 — `scripts/inject-color-themes.mjs` 산출물.
 *
 * 변수 프리픽스는 **반드시 `--fs-`** (FinSight). Tailwind v4 가 `--color-*` 네임스페이스를
 * 자체 예약해 자동 emit 하므로, `--color-` 를 쓰면 우리 변수와 충돌 위험이 있다 → `--fs-` 로 격리.
 * theme.json 의 hex 는 그대로 보존된다(차트 chartTheme.ts 가 빌드타임 hex 직접 소비 — PR3 영역).
 */
function toCssVarColors(
  colors: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(colors)) {
    out[key] = `var(--fs-${key})`;
  }
  return out;
}

function adaptDesignTokens(json: typeof themeJson) {
  const t = json.theme.extend;
  return {
    colors: toCssVarColors(t.colors as Record<string, string>),
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
  // 다크모드는 `html.dark` 클래스 토글로 전환한다(자체 ThemeProvider/FOUC 스크립트가 붙임).
  // 색 분기는 `dark:` variant 가 아니라 `app/theme-vars.css` 의 `html.dark { --fs-* }` 재선언으로
  // 자동 처리되므로(토큰 indirection), 컴포넌트에는 `dark:` 클래스를 쓰지 않는다(PRD G5).
  darkMode: "class",
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
