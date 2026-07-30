import { promises as fs } from "node:fs";
import path from "node:path";
import { buildRuntimeMemorySnapshot } from "../../../packages/intraday-mistake-note/src/memory";
import type { RuntimeMemorySnapshot } from "../../../packages/intraday-mistake-note/src/types";

const MEMORY_PATH = path.join(
  process.cwd(),
  "packages",
  "intraday-mistake-note",
  "CM.md",
);
const CACHE_MS = 60_000;
const MAX_RULES = 1;
const MAX_CHARS = 160;

let cache: { loadedAt: number; markdown: string } | null = null;

export function buildMistakeNoteContext(
  markdown: string,
  scopes: string[] = [],
  maxRules = MAX_RULES,
  maxChars = MAX_CHARS,
): string {
  return buildRuntimeMemorySnapshot(markdown, scopes, maxRules, maxChars).context;
}

export async function loadMistakeNoteSnapshot(
  scopes: string[] = [],
): Promise<RuntimeMemorySnapshot> {
  try {
    const now = Date.now();
    if (!cache || now - cache.loadedAt >= CACHE_MS) {
      cache = { loadedAt: now, markdown: await fs.readFile(MEMORY_PATH, "utf8") };
    }
    return buildRuntimeMemorySnapshot(cache.markdown, scopes, MAX_RULES, MAX_CHARS);
  } catch {
    return {
      status: "IO_ERROR",
      context: "",
      hash: null,
      ruleIds: [],
      sourceThrough: null,
    };
  }
}

export async function loadMistakeNoteContext(scopes: string[] = []): Promise<string> {
  return (await loadMistakeNoteSnapshot(scopes)).context;
}

export function resetMistakeNoteContextCacheForTest(): void {
  cache = null;
}
