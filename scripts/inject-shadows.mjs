#!/usr/bin/env node
/**
 * design:sync 후처리 — 그림자(elevation) 토큰 주입.
 *
 * `@google/design.md export` 는 표준 theme 키(colors/spacing/fontSize/borderRadius/fontFamily)만
 * 흘려보내고 `shadows:` 같은 커스텀 블록은 무시하므로, `inject-breakpoints.mjs`/`inject-color-themes.mjs`
 * 처럼 DESIGN.md front matter 를 직접 파싱해 주입한다.
 *
 * 단일 진실 원천(SSOT): `docs/design/finsight-redesign.md` front matter 의
 *   - `shadows:`      (light)
 *   - `shadows-dark:` (dark)
 *
 * 산출:
 *   1) `tailwind.theme.json.theme.extend.boxShadow` = { key: "var(--fs-shadow-<key>)" }
 *      → `tailwind.config.ts` 어댑터가 흡수 → `shadow-<key>` 유틸리티.
 *   2) `app/shadow-vars.css` = `:root`/`html.dark` 의 `--fs-shadow-*` 선언(라이트/다크 자동 전환).
 *      → `app/globals.css` 가 import.
 *
 * ⚠️ 그림자는 알파(rgba)를 담아야 하므로 불투명 `--fs-*` 색 토큰으로 합성 불가 →
 *    **완전한 CSS 그림자 문자열**로 저작하고 다크는 별도 값(=`shadows-dark`)으로 둔다.
 *    (색 토큰과 달리 dark 폴백을 light 로 두면 어두운 배경에서 그림자가 안 보이므로 parity 강제.)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const DESIGN_PATH = resolve("docs/design/finsight-redesign.md");
const THEME_PATH = resolve("tailwind.theme.json");
const OUT_PATH = resolve("app/shadow-vars.css");

const HEADER =
  "/* 생성 파일 — design:sync(inject-shadows) 산출물. 직접 편집 금지. 그림자는 docs/design/finsight-redesign.md(shadows/shadows-dark)에서 고친다. */\n";

/** front matter 의 `<name>:` 절을 `{ key: "값(문자열 전체)" }` 로 파싱. hex 파서와 달리 그림자 문자열 전체를 캡처. */
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

/** light/dark 키셋 1:1 검증(누락/잉여 시 throw) — 색 토큰과 동일한 방어선. */
function assertParity(light, dark) {
  const lk = Object.keys(light).sort();
  const dk = Object.keys(dark).sort();
  const missing = lk.filter((k) => !(k in dark));
  const extra = dk.filter((k) => !(k in light));
  if (missing.length || extra.length) {
    const p = [];
    if (missing.length) p.push(`shadows-dark 누락: ${missing.join(", ")}`);
    if (extra.length) p.push(`shadows-dark 잉여: ${extra.join(", ")}`);
    throw new Error(`shadows / shadows-dark 키셋 불일치. ${p.join(" / ")}`);
  }
}

function renderVars(selector, map) {
  const decls = Object.entries(map)
    .map(([k, v]) => `  --fs-shadow-${k}: ${v};`)
    .join("\n");
  return `${selector} {\n${decls}\n}\n`;
}

const md = readFileSync(DESIGN_PATH, "utf8");
const light = parseBlock(md, "shadows");
if (!light) throw new Error("shadows 블록을 찾지 못했어요.");
const dark = parseBlock(md, "shadows-dark") ?? { ...light };
assertParity(light, dark);

const theme = JSON.parse(readFileSync(THEME_PATH, "utf8"));
theme.theme.extend.boxShadow = Object.fromEntries(
  Object.keys(light).map((k) => [k, `var(--fs-shadow-${k})`]),
);
writeFileSync(THEME_PATH, JSON.stringify(theme, null, 2) + "\n", "utf8");

writeFileSync(
  OUT_PATH,
  HEADER + "\n" + renderVars(":root", light) + "\n" + renderVars("html.dark", dark),
  "utf8",
);
console.log(
  `design:sync — 그림자 ${Object.keys(light).length}키 주입 (boxShadow + app/shadow-vars.css).`,
);
