import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PaperAppliedChange, PaperImprovementJob } from "@/lib/types/programTrading/programTrading";
import { prepareImprovement } from "./improvementPatch";
import { getLocalPaperRuntime } from "./localPaperRuntime";
import { readPaperImprovementSource, savePaperReviewEvent } from "./reviewHistory";

type Receipt = Extract<PaperAppliedChange, { patchId: string }>;
type Job = PaperImprovementJob & { receipt?: Receipt };
const store = globalThis as typeof globalThis & { programPaperImprovement?: Job };
const activeSession = "운용 중인 모의투자를 종료한 뒤 개선을 적용해 주세요.";

export function currentImprovementJob(): PaperImprovementJob | null {
  const job = store.programPaperImprovement;
  if (!job) return null;
  return { sessionId: job.sessionId, evaluationId: job.evaluationId, stage: job.stage, message: job.message };
}

export function startImprovementJob(sessionId: string, evaluationId: string) {
  const current = store.programPaperImprovement;
  if (current?.stage === "preparing" || current?.stage === "verifying") return false;
  const same = current?.sessionId === sessionId && current.evaluationId === evaluationId;
  if (same && current.stage === "completed") return true;
  if (current?.stage === "history-pending" && !same) return false;

  const job: Job = { sessionId, evaluationId, stage: "preparing", receipt: same ? current.receipt : undefined };
  store.programPaperImprovement = job;
  void run(job);
  return true;
}

async function run(job: Job) {
  const directory = ".local/program-trading/improvement-receipts";
  const receiptFile = join(directory, `${job.sessionId}-${job.evaluationId}.json`);
  try {
    if (!job.receipt) {
      job.receipt = await readFile(receiptFile, "utf8").then(source => JSON.parse(source) as Receipt, error => {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        return undefined;
      });
    }
    if (!job.receipt) {
      const paper = await getLocalPaperRuntime();
      if (typeof paper.withIdleForImprovement !== "function") {
        throw new Error("현재 모의투자를 종료한 뒤 개발 서버를 다시 시작해 주세요.");
      }
      if (!await paper.withIdleForImprovement()) throw new Error(activeSession);
      const evaluation = await readPaperImprovementSource(job.sessionId, job.evaluationId);
      const patch = await prepareImprovement(evaluation, async apply => {
        if (!await paper.withIdleForImprovement(apply)) throw new Error(activeSession);
      }, () => { job.stage = "verifying"; });
      job.receipt = { patchId: randomUUID(), description: patch.summary, files: patch.files, evaluationId: job.evaluationId };
      try {
        await mkdir(directory, { recursive: true, mode: 0o700 });
        await writeFile(`${receiptFile}.tmp`, JSON.stringify(job.receipt), { mode: 0o600 });
        await rename(`${receiptFile}.tmp`, receiptFile);
      } catch {
        console.warn("[program-improvement] local receipt could not be saved");
      }
    }
    await savePaperReviewEvent(job.sessionId, { kind: "applied", id: job.receipt.patchId, details: job.receipt });
    job.message = job.receipt.description;
    job.stage = "completed";
    await rm(receiptFile, { force: true }).catch(() => undefined);
  } catch (error) {
    job.stage = job.receipt ? "history-pending" : "failed";
    job.message = job.receipt
      ? "코드는 반영됐어요. 버튼을 다시 누르면 적용 이력 저장만 재시도해요."
      : error instanceof Error && !("cmd" in error) ? error.message : "개선 작업을 완료하지 못했어요.";
  }
}
