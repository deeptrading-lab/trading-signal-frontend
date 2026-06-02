#!/usr/bin/env node
/**
 * design:sync 후처리 — 색 토큰 CSS 변수(`--fs-*`) 선언 파일을 생성한다.
 *
 * 다크모드 indirection 의 산출물 단계:
 *   tailwind.config.ts 의 colors 맵은 `var(--fs-<key>)` 참조이고(hex 직타 아님),
 *   실제 hex 는 본 스크립트가 만드는 `app/theme-vars.css` 가 선언한다.
 *     :root      { --fs-surface: #ffffff }   ← light
 *     html.dark  { --fs-surface: #161d26 }   ← dark
 *
 * 단일 진실 원천(SSOT):
 *   - light 49키 = `tailwind.theme.json.theme.extend.colors`(@google/design.md export 산출, surface-elevated 포함).
 *   - dark  49키 = `docs/design/finsight-redesign.md` front matter 의 `colors-dark:` 블록.
 *     (export 도구가 colors-dark 를 흘려보내지 않으므로 `inject-breakpoints.mjs` 처럼 직접 파싱.)
 *   - `tailwind.theme.json` 에 다크 hex 를 직접 박지 않는다(#86 SSOT 사고 회피).
 *
 * 검증(시인성 누락 1차 자동 방어선):
 *   - colors-dark 가 있으면 light 키셋과 **1:1 일치**를 강제한다(누락/잉여 키 → throw).
 *   - colors-dark 가 아직 없으면(PR1 시점) dark = light 동일값으로 폴백(경고 로그만).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const DESIGN_PATH = resolve("docs/design/finsight-redesign.md");
const THEME_PATH = resolve("tailwind.theme.json");
const OUT_PATH = resolve("app/theme-vars.css");

const HEADER =
  "/* 생성 파일 — design:sync 산출물. 직접 편집 금지. 색은 docs/design/finsight-redesign.md(colors/colors-dark)에서 고친다. */\n";

/** front matter 의 `<blockName>:` 절을 `{ key: "#hex" }` 맵으로 파싱. 없으면 null. */
function parseColorBlock(md, blockName) {
  const fmMatch = md.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) throw new Error("front matter 를 찾지 못했어요.");
  const fm = fmMatch[1];
  // `\n<blockName>:\n` 다음의 2칸 들여쓰기 라인들을 수집(다른 top-level 키 만나면 종료).
  const re = new RegExp(`\\n${blockName}:\\n((?:  [^\\n]+\\n?)+)`);
  const blockMatch = fm.match(re);
  if (!blockMatch) return null;
  const lines = blockMatch[1].split("\n").filter((l) => l.trim() !== "");
  const out = {};
  for (const line of lines) {
    const m = line.match(/^  ([A-Za-z0-9_-]+):\s*"?(#[0-9a-fA-F]{3,8})"?\s*$/);
    if (!m) continue;
    out[m[1]] = m[2];
  }
  return Object.keys(out).length === 0 ? null : out;
}

/** light 키셋과 dark 키셋의 1:1 일치 검증. 누락/잉여 시 throw. */
function assertKeyParity(lightColors, darkColors) {
  const lightKeys = Object.keys(lightColors).sort();
  const darkKeys = Object.keys(darkColors).sort();
  const missing = lightKeys.filter((k) => !(k in darkColors));
  const extra = darkKeys.filter((k) => !(k in lightColors));
  if (missing.length > 0 || extra.length > 0) {
    const parts = [];
    if (missing.length > 0) parts.push(`colors-dark 누락: ${missing.join(", ")}`);
    if (extra.length > 0) parts.push(`colors-dark 잉여: ${extra.join(", ")}`);
    throw new Error(
      `colors / colors-dark 키셋 불일치 (시인성 누락 방어선). ${parts.join(" / ")}`,
    );
  }
}

function renderVarBlock(selector, colors) {
  const decls = Object.entries(colors)
    .map(([key, hex]) => `  --fs-${key}: ${hex};`)
    .join("\n");
  return `${selector} {\n${decls}\n}\n`;
}

const md = readFileSync(DESIGN_PATH, "utf8");
const theme = JSON.parse(readFileSync(THEME_PATH, "utf8"));
const lightColors = theme.theme.extend.colors;

if (!lightColors || Object.keys(lightColors).length === 0) {
  throw new Error("tailwind.theme.json 에서 colors 를 찾지 못했어요.");
}

const darkParsed = parseColorBlock(md, "colors-dark");

let darkColors;
if (darkParsed) {
  assertKeyParity(lightColors, darkParsed);
  darkColors = darkParsed;
  console.log(
    `design:sync — colors-dark ${Object.keys(darkColors).length}키 파싱·1:1 검증 통과.`,
  );
} else {
  // PR1 시점: colors-dark 미정의 → dark = light 폴백(시각 무변경 보장). PR2 에서 실제 다크값 도입.
  darkColors = { ...lightColors };
  console.warn(
    `design:sync — colors-dark 블록이 없어 dark = light 동일값으로 폴백했어요(시각 무변경). PR2 에서 docs/design/finsight-redesign.md 에 colors-dark 를 추가하세요.`,
  );
}

const css =
  HEADER +
  "\n" +
  renderVarBlock(":root", lightColors) +
  "\n" +
  renderVarBlock("html.dark", darkColors);

writeFileSync(OUT_PATH, css, "utf8");
console.log(
  `design:sync — app/theme-vars.css 생성 완료 (light ${Object.keys(lightColors).length}키 / dark ${Object.keys(darkColors).length}키).`,
);
