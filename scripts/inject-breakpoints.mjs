#!/usr/bin/env node
/**
 * design:sync 후처리 — `@google/design.md export --format tailwind` 가
 * front matter 의 `breakpoints` 토큰을 흘려보내지 않으므로 (export 도구의 spec 한계),
 * DESIGN.md 의 YAML front matter 를 직접 파싱해 `tailwind.theme.json.theme.extend.screens` 로 주입한다.
 *
 * 단일 진실 원천: `docs/design/design-tone-refinement.md` 의 `breakpoints:` 절 (v7).
 * 본 스크립트는 hex/px 직타 없이 DESIGN.md 토큰 값만 그대로 옮긴다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const DESIGN_PATH = resolve("docs/design/design-tone-refinement.md");
const THEME_PATH = resolve("tailwind.theme.json");

function parseBreakpoints(md) {
  // front matter `---` 펜스 안의 `breakpoints:` 절을 추출.
  const fmMatch = md.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) throw new Error("front matter 를 찾지 못했어요.");
  const fm = fmMatch[1];
  const bpMatch = fm.match(/\nbreakpoints:\n((?:  [^\n]+\n)+)/);
  if (!bpMatch) throw new Error("breakpoints 절을 찾지 못했어요.");
  const lines = bpMatch[1].split("\n").filter((l) => l.trim() !== "");
  const out = {};
  for (const line of lines) {
    const m = line.match(/^  ([A-Za-z0-9_-]+):\s*"?([0-9]+px)"?\s*$/);
    if (!m) continue;
    out[m[1]] = m[2];
  }
  if (Object.keys(out).length === 0) {
    throw new Error("breakpoints 절에서 키를 파싱하지 못했어요.");
  }
  return out;
}

const md = readFileSync(DESIGN_PATH, "utf8");
const screens = parseBreakpoints(md);

const theme = JSON.parse(readFileSync(THEME_PATH, "utf8"));
theme.theme.extend.screens = screens;
writeFileSync(THEME_PATH, JSON.stringify(theme, null, 2) + "\n", "utf8");

const summary = Object.entries(screens)
  .map(([k, v]) => `${k}=${v}`)
  .join(", ");
console.log(`design:sync — screens 주입 완료 (${summary}).`);
