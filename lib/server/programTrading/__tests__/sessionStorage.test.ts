import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { listPaperReviewArchives, trimPaperReviews } from "../sessionStorage";

it("keeps at most 100 result files including the current review, while preserving archived ledgers", async () => {
  const archive = await mkdtemp(join(tmpdir(), "program-archive-"));
  try {
    const sessions = Array.from({ length: 101 }, (_, index) => {
      const date = new Date(Date.UTC(2026, 0, 1, 0, index));
      return `${date.toISOString().replaceAll(":", "-")}-00000000-0000-4000-8000-000000000000`;
    });
    await Promise.all(sessions.map(async id => {
      const directory = join(archive, id);
      await mkdir(directory);
      await writeFile(join(directory, "review.json"), "{}");
    }));
    const ledger = join(archive, sessions[0], "trades.jsonl");
    await writeFile(ledger, "original ledger");

    await trimPaperReviews(false, archive);
    expect(await listPaperReviewArchives(archive)).toEqual(sessions.slice(1).reverse());
    await trimPaperReviews(true, archive);
    expect(await listPaperReviewArchives(archive)).toEqual(sessions.slice(2).reverse());
    expect(await readFile(ledger, "utf8")).toBe("original ledger");
  } finally {
    await rm(archive, { recursive: true, force: true });
  }
});
