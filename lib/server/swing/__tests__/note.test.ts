/** AI 노트 서버 쪽 — 재사용 정책, 프롬프트, "노트 경로는 판정 저장소를 건드리지 않는다" 가드. */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NOTE_FRESH_MS, reusableNote } from "../noteStore";
import { buildSwingNotePrompt, parseNoteJson } from "../noteRunner";
import type { SwingNote } from "@/lib/types/swing/api";

const NOW = Date.parse("2026-11-02T03:00:00Z");
const note = (over: Partial<SwingNote>): SwingNote => ({
  id: 1,
  ticker: "005930",
  status: "done",
  items: [],
  createdAt: new Date(NOW - 60_000).toISOString(),
  finishedAt: null,
  ...over,
});

describe("reusableNote — 새로 만들지 않고 돌려줄 노트", () => {
  it("진행 중이면 그대로(중복 실행 방지)", () => {
    expect(reusableNote(note({ status: "pending" }), NOW)?.status).toBe("pending");
    expect(reusableNote(note({ status: "processing" }), NOW)?.status).toBe("processing");
  });
  it("완료 6시간 안이면 재사용, 지나면 새로", () => {
    expect(reusableNote(note({}), NOW)).not.toBeNull();
    const old = note({ createdAt: new Date(NOW - NOTE_FRESH_MS - 1).toISOString() });
    expect(reusableNote(old, NOW)).toBeNull();
  });
  it("신선도는 완료 시각 기준(워커가 늦게 처리해도 6시간 온전히)", () => {
    const lateDone = note({
      createdAt: new Date(NOW - NOTE_FRESH_MS - 3_600_000).toISOString(),
      finishedAt: new Date(NOW - 60_000).toISOString(),
    });
    expect(reusableNote(lateDone, NOW)).not.toBeNull();
  });
  it("실패·없음이면 새로", () => {
    expect(reusableNote(note({ status: "failed" }), NOW)).toBeNull();
    expect(reusableNote(null, NOW)).toBeNull();
  });
});

describe("parseNoteJson — 실측 응답 꼴", () => {
  it("코드 블록·닫는 괄호 누락(실측)도 읽는다", () => {
    expect(parseNoteJson('```json\n{"items":[]}\n```')).toEqual({ items: [] });
    expect(parseNoteJson('{"items":[{"a":1}]')).toEqual({ items: [{ a: 1 }] });
    expect(parseNoteJson('{"items":[{"a":1}')).toEqual({ items: [{ a: 1 }] });
    expect(parseNoteJson("검색 결과가 없어요")).toBeNull();
  });
});

describe("buildSwingNotePrompt", () => {
  it("기준일·종목·enum·권유 금지를 담는다", () => {
    const { systemPrompt, userPrompt } = buildSwingNotePrompt("005930", "삼성전자", "2026-11-02");
    expect(systemPrompt).toContain("2026-11-02");
    expect(systemPrompt).toContain("earnings|disclosure");
    expect(systemPrompt).toContain("positive|negative|neutral");
    expect(systemPrompt).toContain("매매 권유를 하지 않는다");
    expect(userPrompt).toContain("삼성전자 (005930)");
  });
});

// 주석("판정 저장소를 건드리지 않는다" 같은 설명)은 빼고 코드만 본다.
const codeOf = (f: string) =>
  readFileSync(path.resolve(process.cwd(), f), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("판정 불가침 — 노트 경로는 swing_judgments 를 모른다", () => {
  const files = [
    "lib/server/swing/noteStore.ts",
    "lib/server/swing/noteRunner.ts",
    "app/api/swing/note/[ticker]/route.ts",
  ];
  it.each(files)("%s", (f) => {
    expect(codeOf(f)).not.toMatch(/swing_judgments|upsertSwingRows|server\/swing\/store"|judgeSwing|computeSwingJudgment/);
  });
});

describe("판정 불가침(반대 방향) — 판정 경로는 노트를 읽지 않는다", () => {
  const files = [
    "lib/swing/judge.ts",
    "lib/swing/features.ts",
    "lib/server/swing/compute.ts",
    "lib/server/swing/store.ts",
    "lib/server/swing/screener.ts",
    "app/api/swing/judgment/[ticker]/route.ts",
    "app/api/swing/screener/route.ts",
    "app/api/cron/swing-screener/route.ts",
  ];
  it.each(files)("%s", (f) => {
    expect(codeOf(f)).not.toMatch(/swing_ai_notes|noteStore|noteRunner|swing\/note"/);
  });
});
