import { promises as fs } from "node:fs";
import path from "node:path";

const MEMORY_PATH = path.join(
  process.cwd(),
  "packages",
  "intraday-mistake-note",
  "CM.md",
);
const CACHE_MS = 60_000;
const MAX_RULES = 6;
const MAX_CHARS = 900;

let cache: { loadedAt: number; markdown: string } | null = null;

export function buildMistakeNoteContext(
  markdown: string,
  scopes: string[] = [],
  maxRules = MAX_RULES,
  maxChars = MAX_CHARS,
): string {
  const start = markdown.indexOf("<!-- AI_CONTEXT_START -->");
  const end = markdown.indexOf("<!-- AI_CONTEXT_END -->");
  if (start < 0 || end <= start) return "";
  const scopeSet = new Set(scopes);
  const todayKst = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const lines = markdown
    .slice(start, end)
    .split("\n")
    .filter((line) => line.startsWith("- S:ACTIVE") || line.startsWith("- S:SHADOW"))
    .filter((line) => {
      const until = line.match(/\| UNTIL:(\d{4}-\d{2}-\d{2}) \|/)?.[1];
      return !until || until >= todayKst;
    })
    .filter(
      (line) =>
        scopeSet.size === 0 || [...scopeSet].some((scope) => line.includes(`| T:${scope} |`)),
    )
    .slice(0, maxRules);
  if (lines.length === 0) return "";
  const prefix = "[검증형 오답노트] SHADOW는 참고만, 안전핀 완화 금지\n";
  const selected: string[] = [];
  for (const line of lines) {
    const next = prefix + [...selected, line].join("\n");
    if (next.length > maxChars) break;
    selected.push(line);
  }
  return selected.length ? prefix + selected.join("\n") : "";
}

export async function loadMistakeNoteContext(scopes: string[] = []): Promise<string> {
  try {
    const now = Date.now();
    if (!cache || now - cache.loadedAt >= CACHE_MS) {
      cache = { loadedAt: now, markdown: await fs.readFile(MEMORY_PATH, "utf8") };
    }
    return buildMistakeNoteContext(cache.markdown, scopes);
  } catch {
    return "";
  }
}

export function resetMistakeNoteContextCacheForTest(): void {
  cache = null;
}
