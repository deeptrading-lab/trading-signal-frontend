import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectDay, hashCollectedDay } from "./collect";
import { deriveDailySource } from "./derive";
import { buildMemory } from "./memory";
import { renderReview, renderStandaloneHtml } from "./render";
import type { DailyMistakeSource } from "./types";
import { validateArtifacts } from "./validate";

const PACKAGE_ROOT = fileURLToPath(new URL("../", import.meta.url));

function kstDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function previousKstDay(): string {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() - 1);
  return kstDate(value);
}

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function operatorKey(operator: string): string {
  return `operator-${createHash("sha1").update(operator).digest("hex").slice(0, 8)}`;
}

async function atomicWrite(target: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(temp, content, "utf8");
  await fs.rename(temp, target);
}

async function sourceFiles(directory = path.join(PACKAGE_ROOT, "sources")): Promise<string[]> {
  const files: string[] = [];
  const walk = async (current: string) => {
    const entries = await fs.readdir(current, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile() && entry.name.endsWith(".json")) files.push(absolute);
    }
  };
  await walk(directory);
  return files.sort();
}

async function loadSources(): Promise<DailyMistakeSource[]> {
  const results: DailyMistakeSource[] = [];
  for (const file of await sourceFiles()) {
    const value = JSON.parse(await fs.readFile(file, "utf8")) as DailyMistakeSource;
    if (value?.schemaVersion === 1 && Array.isArray(value.candidates)) results.push(value);
  }
  return results;
}

async function persistRetired(result: ReturnType<typeof buildMemory>): Promise<void> {
  if (result.retired.length === 0) return;
  const target = path.join(PACKAGE_ROOT, "archive", "retired.ndjson");
  const existing = await fs.readFile(target, "utf8").catch(() => "");
  const known = new Set(
    existing
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const item = JSON.parse(line) as { key: string; retiredAt: string; reason: string };
        return `${item.key}|${item.retiredAt}|${item.reason}`;
      }),
  );
  const additions = result.retired.filter(
    (item) => !known.has(`${item.key}|${item.retiredAt}|${item.reason}`),
  );
  if (additions.length === 0) return;
  const content =
    existing.replace(/\n?$/, "\n") + additions.map((item) => JSON.stringify(item)).join("\n") + "\n";
  await atomicWrite(target, content);
}

async function rebuild(write = true): Promise<ReturnType<typeof buildMemory>> {
  const sources = await loadSources();
  const result = buildMemory(sources);
  const validation = validateArtifacts(sources, result.markdown);
  if (!validation.ok) throw new Error(validation.errors.join("\n"));
  if (write) {
    await atomicWrite(path.join(PACKAGE_ROOT, "CM.md"), result.markdown);
    await persistRetired(result);
  }
  return result;
}

async function renderLatest(): Promise<void> {
  const sources = (await loadSources())
    .filter((source) => source.status === "READY")
    .sort((a, b) => a.date.localeCompare(b.date));
  const memory = buildMemory(sources);
  const html = renderStandaloneHtml(sources.at(-1) ?? null, memory.rules, memory.conflicts);
  await atomicWrite(path.join(PACKAGE_ROOT, "reports", "latest.html"), html);
}

async function runReview(dryRun: boolean): Promise<void> {
  const day = option("--date") ?? previousKstDay();
  const collected = await collectDay(day);
  const inputHash = hashCollectedDay(collected);
  const key = operatorKey(collected.operator);
  const manifestPath = path.join(PACKAGE_ROOT, "state", "manifests", `${key}.json`);
  const manifest = JSON.parse(
    await fs.readFile(manifestPath, "utf8").catch(() => "{}"),
  ) as { lastSuccessfulDate?: string; lastInputHash?: string };
  if (!dryRun && manifest.lastSuccessfulDate === day && manifest.lastInputHash === inputHash) {
    console.log(`UNCHANGED ${day} ${inputHash.slice(0, 12)}`);
    return;
  }

  const source = deriveDailySource(collected, inputHash, `ai-daily:${key}`);
  const sources = [...(await loadSources()).filter(
    (item) => !(item.namespace === source.namespace && item.date === source.date),
  ), source];
  const memory = buildMemory(sources);
  const validation = validateArtifacts(sources, memory.markdown);
  if (!validation.ok) throw new Error(validation.errors.join("\n"));
  const review = renderReview(source, memory.rules);
  console.log(review);
  if (dryRun) return;

  const sourcePath = path.join(PACKAGE_ROOT, "sources", "ai-daily", key, `${day}.json`);
  const reviewPath = path.join(PACKAGE_ROOT, "reviews", key, `${day}.md`);
  await atomicWrite(sourcePath, `${JSON.stringify(source, null, 2)}\n`);
  await atomicWrite(reviewPath, review);
  if (source.status === "READY") {
    await atomicWrite(path.join(PACKAGE_ROOT, "CM.md"), memory.markdown);
    await persistRetired(memory);
    await atomicWrite(
      manifestPath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          lastSuccessfulDate: day,
          lastInputHash: inputHash,
          updatedAt: new Date().toISOString(),
        },
        null,
        2,
      )}\n`,
    );
  }
  await atomicWrite(
    path.join(PACKAGE_ROOT, "reports", "latest.html"),
    renderStandaloneHtml(source.status === "READY" ? source : null, memory.rules, memory.conflicts),
  );
  console.log(`SAVED ${source.status} ${sourcePath}`);
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? "review";
  if (command === "review") return runReview(false);
  if (command === "dry") return runReview(true);
  if (command === "merge") {
    const result = await rebuild(true);
    await renderLatest();
    console.log(`MERGED rules=${result.rules.length} conflicts=${result.conflicts.length} retired=${result.retired.length}`);
    return;
  }
  if (command === "validate") {
    const sources = await loadSources();
    const memory = await fs.readFile(path.join(PACKAGE_ROOT, "CM.md"), "utf8");
    const result = validateArtifacts(sources, memory);
    if (!result.ok) throw new Error(result.errors.join("\n"));
    console.log(`VALID sources=${sources.length} chars=${memory.length}`);
    return;
  }
  if (command === "render") {
    await renderLatest();
    console.log("RENDERED reports/latest.html");
    return;
  }
  throw new Error(`지원하지 않는 명령: ${command}`);
}

await main();
