import { readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PaperSessionReview } from "@/lib/types/programTrading/programTrading";

export const paperSessionDirectory = ".local/program-trading/toss-paper";
export const paperArchiveDirectory = ".local/program-trading/toss-paper-archive";

const archiveName = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})(\.\d{3}Z)-[\da-f-]{36}$/;
const reviewLimit = 100;

async function readReview(directory: string) {
  try {
    return await readFile(join(directory, "review.json"), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return null;
  }
}

export async function listPaperReviewArchives(directory = paperArchiveDirectory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const ids = entries.filter(entry => entry.isDirectory() && archiveName.test(entry.name))
      .map(entry => entry.name).sort().reverse();
    const reports = [];
    for (const id of ids) {
      const file = await stat(join(directory, id, "review.json")).catch(error => {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        return null;
      });
      if (file?.isFile()) reports.push(id);
    }
    return reports;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return [];
  }
}

export async function writePaperReview(directory: string, review: PaperSessionReview) {
  const temp = join(directory, "review.json.tmp");
  await writeFile(temp, JSON.stringify(review, null, 2), { mode: 0o600 });
  await rename(temp, join(directory, "review.json"));
}

export async function trimPaperReviews(hasCurrentReview: boolean, directory = paperArchiveDirectory) {
  const archives = await listPaperReviewArchives(directory);
  for (const id of archives.slice(reviewLimit - Number(hasCurrentReview))) {
    await unlink(join(directory, id, "review.json")).catch(error => {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    });
  }
}

export async function loadPaperReviews(requestedId?: string) {
  const [currentReview, archives] = await Promise.all([readReview(paperSessionDirectory), listPaperReviewArchives()]);
  const sessions: { id: string; archivedAt: string | null }[] = archives.flatMap(id => {
    const parts = archiveName.exec(id);
    if (!parts) return [];
    const [, date, hours, minutes, seconds, milliseconds] = parts;
    const archivedAt = `${date}T${hours}:${minutes}:${seconds}${milliseconds}`;
    return Number.isFinite(Date.parse(archivedAt)) ? [{ id, archivedAt }] : [];
  });
  if (currentReview !== null) sessions.unshift({ id: "current", archivedAt: null });

  const selected = requestedId === undefined ? sessions[0] : sessions.find(session => session.id === requestedId);
  let json: string | null = null;
  if (selected) {
    json = selected.id === "current" ? currentReview : await readReview(join(paperArchiveDirectory, selected.id));
  }
  const review: PaperSessionReview | null = json === null ? null : JSON.parse(json);
  return { sessions, selectedId: selected?.id, review };
}
