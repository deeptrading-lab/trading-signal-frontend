#!/usr/bin/env node
/**
 * design:sync 후처리 — 모션(듀레이션·이징) 토큰 주입. **테마 무관**(라이트/다크 동일).
 *
 * SSOT: `docs/design/finsight-redesign.md` front matter 의 `motion:` 절.
 *   duration-* = "<n>ms",  ease-* = "cubic-bezier(...)".
 *
 * 산출:
 *   1) `tailwind.theme.json.theme.extend.transitionDuration` + `transitionTimingFunction`
 *      → 어댑터 흡수 → `duration-<key>` / `ease-<key>` 유틸리티(및 components.css @apply).
 *   2) `lib/motion/tokens.ts` — `motion/react` 용 JS 값(듀레이션은 초 숫자, 이징은 [x1,y1,x2,y2] 배열).
 *      motion/react 의 `transition={{ duration, ease }}` 는 CSS 변수 문자열이 아닌 JS 값을 요구하므로 별도 생성.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const DESIGN_PATH = resolve("docs/design/finsight-redesign.md");
const THEME_PATH = resolve("tailwind.theme.json");
const TS_DIR = resolve("lib/motion");
const TS_PATH = resolve("lib/motion/tokens.ts");

function parseBlock(md, name) {
  const fm = md.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) throw new Error("front matter 를 찾지 못했어요.");
  const m = fm[1].match(new RegExp(`\\n${name}:\\n((?:  [^\\n]+\\n?)+)`));
  if (!m) return null;
  const out = {};
  for (const line of m[1].split("\n")) {
    const mm = line.match(/^ {2}([A-Za-z0-9_-]+):\s*"?(.+?)"?\s*$/);
    if (mm) out[mm[1]] = mm[2].trim();
  }
  return Object.keys(out).length ? out : null;
}

const md = readFileSync(DESIGN_PATH, "utf8");
const motion = parseBlock(md, "motion");
if (!motion) throw new Error("motion 블록을 찾지 못했어요.");

const durations = {};
const easings = {};
for (const [k, v] of Object.entries(motion)) {
  if (k.startsWith("duration-")) durations[k.slice("duration-".length)] = v;
  else if (k.startsWith("ease-")) easings[k.slice("ease-".length)] = v;
}

// 1) tailwind.theme.json 주입 (CSS 유틸)
const theme = JSON.parse(readFileSync(THEME_PATH, "utf8"));
theme.theme.extend.transitionDuration = durations;
theme.theme.extend.transitionTimingFunction = easings;
writeFileSync(THEME_PATH, JSON.stringify(theme, null, 2) + "\n", "utf8");

// 2) lib/motion/tokens.ts 생성 (motion/react 용 JS 값)
const durSec = Object.fromEntries(
  Object.entries(durations).map(([k, v]) => [k, parseFloat(v) / 1000]),
);
const easeArr = Object.fromEntries(
  Object.entries(easings).map(([k, v]) => {
    const inner = (v.match(/cubic-bezier\(([^)]+)\)/) || [])[1];
    return [k, inner ? inner.split(",").map((s) => parseFloat(s.trim())) : v];
  }),
);
mkdirSync(TS_DIR, { recursive: true });
const ts =
  "// 생성 파일 — design:sync(inject-motion) 산출물. 직접 편집 금지.\n" +
  "// 모션 토큰(motion/react 용). CSS 측은 tailwind 의 duration-*/ease-* 유틸리티를 쓴다.\n" +
  `export const DURATION = ${JSON.stringify(durSec)} as const;\n` +
  `export const EASE = ${JSON.stringify(easeArr)} as const;\n`;
writeFileSync(TS_PATH, ts, "utf8");

console.log(
  `design:sync — 모션 주입 (duration ${Object.keys(durSec).length}·ease ${Object.keys(easeArr).length}, theme + lib/motion/tokens.ts).`,
);
