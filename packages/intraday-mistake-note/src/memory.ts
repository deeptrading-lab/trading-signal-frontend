import { createHash } from "node:crypto";
import type {
  DailyMistakeSource,
  MemoryBuildResult,
  MemoryRule,
  RuleCandidate,
} from "./types";

const MAX_RULES = 12;
const MAX_CHARS = 1_800;

function ruleId(key: string): string {
  return `AI-${createHash("sha1").update(key).digest("hex").slice(0, 8).toUpperCase()}`;
}

function plusDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day) + days * 24 * 60 * 60 * 1_000);
  return value.toISOString().slice(0, 10);
}

function signature(candidate: RuleCandidate): string {
  return [candidate.scope, candidate.condition, candidate.action, candidate.avoid].join("|");
}

function formatRule(rule: MemoryRule): string {
  return `- S:${rule.status} | R:${rule.id} | T:${rule.scope} | IF:${rule.condition} | DO:${rule.action} | AVOID:${rule.avoid} | E:${rule.evidence} | UNTIL:${rule.until} | kw:${rule.keywords.join(",")}`;
}

export function buildMemory(
  sources: DailyMistakeSource[],
  generatedAt = new Date().toISOString(),
): MemoryBuildResult {
  const ready = sources.filter((source) => source.status === "READY");
  const byKey = new Map<string, Array<{ source: DailyMistakeSource; candidate: RuleCandidate }>>();
  for (const source of ready) {
    for (const candidate of source.candidates) {
      const list = byKey.get(candidate.key) ?? [];
      list.push({ source, candidate });
      byKey.set(candidate.key, list);
    }
  }

  const conflicts: string[] = [];
  const retired: MemoryBuildResult["retired"] = [];
  const rules: MemoryRule[] = [];
  const asOf = generatedAt.slice(0, 10);
  for (const [key, rows] of byKey) {
    const signatures = new Set(rows.map((row) => signature(row.candidate)));
    if (signatures.size > 1) {
      conflicts.push(key);
      continue;
    }
    const supporting = rows.filter((row) => row.candidate.supports);
    if (supporting.length === 0) continue;
    const supportDays = new Set(supporting.map((row) => row.source.date)).size;
    const independentSamples = supporting.reduce(
      (sum, row) => sum + row.candidate.independentSamples,
      0,
    );
    const closedTrades = supporting.reduce((sum, row) => sum + row.candidate.closedTrades, 0);
    const wins = supporting.reduce((sum, row) => sum + row.candidate.wins, 0);
    const losses = supporting.reduce((sum, row) => sum + row.candidate.losses, 0);
    const netRows = supporting.filter((row) => row.candidate.netPnlKrw !== null);
    const netPnl = netRows.reduce((sum, row) => sum + (row.candidate.netPnlKrw ?? 0), 0);
    const latest = supporting.map((row) => row.source.date).sort().at(-1)!;
    const candidate = supporting.at(-1)!.candidate;
    const active =
      supportDays >= 3 &&
      independentSamples >= 20 &&
      closedTrades >= 20 &&
      netRows.length > 0 &&
      netPnl < 0;
    const byDate = new Map<string, boolean>();
    for (const row of rows) {
      byDate.set(row.source.date, (byDate.get(row.source.date) ?? false) || row.candidate.supports);
    }
    const recentDays = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-2);
    const contradicted = recentDays.length === 2 && recentDays.every(([, supports]) => !supports);
    const totalIndependent = rows.reduce(
      (sum, row) => sum + row.candidate.independentSamples,
      0,
    );
    const until = plusDays(latest, active ? 30 : 14);
    if (asOf > until) {
      retired.push({ key, retiredAt: asOf, reason: `만료(${until})` });
      continue;
    }
    if (byDate.size >= 10 && totalIndependent >= 50 && contradicted) {
      retired.push({ key, retiredAt: asOf, reason: "최근 2개 OOS 창 반대증거" });
      continue;
    }
    rules.push({
      id: ruleId(key),
      key,
      status: active ? "ACTIVE" : "SHADOW",
      scope: candidate.scope,
      condition: candidate.condition,
      action: candidate.action,
      avoid: candidate.avoid,
      evidence: `d=${supportDays},n=${independentSamples},tr=${closedTrades},W/L=${wins}/${losses},net=${Math.round(netPnl)}`,
      until,
      keywords: candidate.keywords.slice(0, 4),
    });
  }
  rules.sort((a, b) => {
    if (a.status !== b.status) return a.status === "ACTIVE" ? -1 : 1;
    return a.id.localeCompare(b.id);
  });

  const header = [
    "# AI 단타 Compact Memory (자동 생성)",
    `updated:${generatedAt} | objective:비용후 순기대값↑·낙폭↓ | goal-zone:일 +1~2%(관찰값·보장아님)`,
    "SHADOW=참고만/하드게이트금지 | ACTIVE도 손실킬·15:00진입금지·15:20청산·하드스톱 완화금지",
    "<!-- AI_CONTEXT_START -->",
  ];
  const footer = ["<!-- AI_CONTEXT_END -->", "퇴역 규칙은 archive/retired.ndjson; 원시 데이터·긴 서사는 주입하지 않음."];
  const selected: MemoryRule[] = [];
  for (const rule of rules.slice(0, MAX_RULES)) {
    const candidate = [...header, ...selected.map(formatRule), formatRule(rule), ...footer].join("\n");
    if (candidate.length > MAX_CHARS) break;
    selected.push(rule);
  }
  const markdown = [...header, ...selected.map(formatRule), ...footer].join("\n") + "\n";
  return { markdown, rules: selected, conflicts, retired };
}

export function buildRuntimeContext(
  markdown: string,
  scopes: string[] = [],
  maxRules = 6,
  maxChars = 900,
): string {
  const start = markdown.indexOf("<!-- AI_CONTEXT_START -->");
  const end = markdown.indexOf("<!-- AI_CONTEXT_END -->");
  if (start < 0 || end <= start) return "";
  const allowed = new Set(scopes);
  const lines = markdown
    .slice(start, end)
    .split("\n")
    .filter((line) => line.startsWith("- S:"))
    .filter((line) => {
      const until = line.match(/\| UNTIL:(\d{4}-\d{2}-\d{2}) \|/)?.[1];
      return !until || until >= new Date().toISOString().slice(0, 10);
    })
    .filter((line) => allowed.size === 0 || [...allowed].some((scope) => line.includes(`| T:${scope} |`)))
    .slice(0, maxRules);
  if (lines.length === 0) return "";
  const prefix = "[검증형 오답노트] SHADOW는 참고만, 안전핀 완화 금지\n";
  const selected: string[] = [];
  for (const line of lines) {
    if ((prefix + [...selected, line].join("\n")).length > maxChars) break;
    selected.push(line);
  }
  return selected.length ? prefix + selected.join("\n") : "";
}
