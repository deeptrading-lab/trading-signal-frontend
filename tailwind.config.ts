/**
 * Tailwind theme — DESIGN.md (`docs/design/workbench-analyze-rebuild.md`) 의 토큰을
 * `tailwind.theme.json` 으로 export 한 결과를 그대로 흡수한다.
 *
 * 파이프라인:
 *   1) 디자이너가 DESIGN.md 의 토큰을 수정.
 *   2) `npm run design:sync` → `tailwind.theme.json` 갱신.
 *   3) `npm run build` → 본 config 가 JSON 을 import → Tailwind theme.extend 에 주입.
 *
 * 어댑터(`adaptDesignTokens`) 의 책임:
 *   - DESIGN.md 의 `typography.<name>.lineHeight` / `fontFeature` 는 export 도구가
 *     fontSize 튜플에 포함시키지 않으므로 본 어댑터에서 직접 흡수 (PRD §9 #5).
 *   - 그 외 colors / spacing / borderRadius / fontFamily / fontSize / fontWeight 는
 *     theme.json 의 키 구조가 Tailwind 와 1:1 정합하므로 spread 만으로 충분.
 */

import type { Config } from "tailwindcss";
import themeJson from "./tailwind.theme.json";

// DESIGN.md 의 typography 토큰을 직접 옮겨둔다 (export 도구가 lineHeight / fontFeature 를 누락하므로 보완).
const TYPOGRAPHY_EXTRAS: Record<
  string,
  { lineHeight: string; fontFeature?: string }
> = {
  display: { lineHeight: "1.18" },
  h1: { lineHeight: "1.2" },
  h2: { lineHeight: "1.35" },
  "body-md": { lineHeight: "1.55" },
  "body-sm": { lineHeight: "1.5" },
  "body-strong": { lineHeight: "1.5" },
  caption: { lineHeight: "1.4" },
  button: { lineHeight: "1.2" },
  badge: { lineHeight: "1.2" },
  "mono-numeric": { lineHeight: "1.2", fontFeature: '"tnum"' },
};

type RawFontSizeEntry = [string, { fontWeight?: string }];
type AdaptedFontSizeEntry = [
  string,
  { lineHeight: string; fontWeight?: string; fontFeatureSettings?: string },
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
    out[name] = [
      size,
      {
        lineHeight: extras.lineHeight,
        ...(meta?.fontWeight ? { fontWeight: meta.fontWeight } : {}),
        ...(extras.fontFeature
          ? { fontFeatureSettings: extras.fontFeature }
          : {}),
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
