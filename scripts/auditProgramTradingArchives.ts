import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { PaperSessionReview } from "@/lib/types/programTrading/programTrading";
import { parseJournal } from "@/lib/server/programTrading/journal";
import { auditPaperSession } from "@/lib/server/programTrading/reviewAudit";
import { listPaperReviewArchives, paperArchiveDirectory, paperSessionDirectory, trimPaperReviews, writePaperReview } from "@/lib/server/programTrading/sessionStorage";

async function main() {
  const hasCurrentReview = await stat(join(paperSessionDirectory, "review.json")).then(file => file.isFile()).catch(error => {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return false;
  });
  await trimPaperReviews(hasCurrentReview);
  for (const id of await listPaperReviewArchives()) {
    const directory = join(paperArchiveDirectory, id);
    const review: PaperSessionReview = JSON.parse(await readFile(join(directory, "review.json"), "utf8"));
    if (review.audit) continue;
    const events = parseJournal(await readFile(join(directory, "trades.jsonl"), "utf8"));
    if (!events.length || events.some(event => event.rulesVersion !== "program-v2" || event.mode !== "toss-paper")) {
      console.log(`검수 기준과 원장 버전을 대조해 주세요. ${id}`);
      continue;
    }
    const audit = auditPaperSession(review, events, "a9f2cca · program-v2");
    await writePaperReview(directory, { ...review, audit });
    console.log(`보관 세션 검수 저장 완료 ${id}`);
  }
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
