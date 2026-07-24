import fs from "node:fs/promises";
import path from "node:path";
import { buildMemory } from "../../../packages/intraday-mistake-note/src/memory";
import type { DailyMistakeSource } from "../../../packages/intraday-mistake-note/src/types";
import { validateArtifacts } from "../../../packages/intraday-mistake-note/src/validate";
import type {
  MistakeNoteDashboardData,
  MistakeNotePolicy,
} from "@/lib/types/intraday/mistakeNoteDashboard";

const PACKAGE_ROOT = path.join(process.cwd(), "packages", "intraday-mistake-note");
const SOURCE_ROOT = path.join(PACKAGE_ROOT, "sources");

async function findJsonFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const resolved = path.join(directory, entry.name);
      if (entry.isDirectory()) return findJsonFiles(resolved);
      return entry.isFile() && entry.name.endsWith(".json") ? [resolved] : [];
    }),
  );
  return nested.flat();
}

export function buildMistakeNoteDashboard(
  sources: DailyMistakeSource[],
  memoryMarkdown: string,
  policy: MistakeNotePolicy,
  loadedAt = new Date().toISOString(),
): MistakeNoteDashboardData {
  const ordered = [...sources].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    return byDate || b.generatedAt.localeCompare(a.generatedAt);
  });
  const latest = ordered.find((source) => source.status === "READY") ?? ordered[0] ?? null;
  const memoryBuild = buildMemory(sources, loadedAt);
  const validation = validateArtifacts(sources, memoryMarkdown);
  const updatedAt = memoryMarkdown.match(/^updated:([^ |]+)/m)?.[1] ?? null;
  const ruleLines = (value: string) =>
    value.split("\n").filter((line) => line.startsWith("- S:")).join("\n");

  return {
    loadedAt,
    sourceCount: sources.length,
    latest,
    days: ordered.map((source) => ({
      namespace: source.namespace,
      date: source.date,
      operator: source.operator,
      status: source.status,
      quality: source.quality,
      actual: source.actual,
      counterfactualBuy: source.counterfactualBuy,
      selection: source.selection,
      candidateCount: source.candidates.length,
    })),
    memory: {
      updatedAt,
      charCount: memoryMarkdown.length,
      maxChars: policy.memory.maxChars,
      ruleCount: memoryBuild.rules.length,
      maxRules: policy.memory.maxRules,
      activeCount: memoryBuild.rules.filter((rule) => rule.status === "ACTIVE").length,
      shadowCount: memoryBuild.rules.filter((rule) => rule.status === "SHADOW").length,
      runtimeMaxRules: policy.memory.runtimeMaxRules,
      runtimeMaxChars: policy.memory.runtimeMaxChars,
      rules: memoryBuild.rules,
      conflicts: memoryBuild.conflicts,
      sourceSynced: ruleLines(memoryBuild.markdown) === ruleLines(memoryMarkdown),
    },
    policy: {
      runAfterKst: policy.runAfterKst,
      goalZonePct: policy.goalZonePct,
    },
    validation,
  };
}

export async function loadMistakeNoteDashboard(): Promise<MistakeNoteDashboardData> {
  const [sourceFiles, memoryMarkdown, policyRaw] = await Promise.all([
    findJsonFiles(SOURCE_ROOT),
    fs.readFile(path.join(PACKAGE_ROOT, "CM.md"), "utf8"),
    fs.readFile(path.join(PACKAGE_ROOT, "config", "policy.json"), "utf8"),
  ]);
  const sources = await Promise.all(
    sourceFiles.map(async (file) => JSON.parse(await fs.readFile(file, "utf8")) as DailyMistakeSource),
  );
  return buildMistakeNoteDashboard(
    sources,
    memoryMarkdown,
    JSON.parse(policyRaw) as MistakeNotePolicy,
  );
}
