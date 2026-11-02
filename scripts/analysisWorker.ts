/**
 * 로컬 AI 워커 — 스윙 체크 AI 노트(뉴스·공시 정리) 요청을 처리한다(PRD `swing-judgment` PR-4·PR-5).
 *
 * 실행: `npm run analyze:worker`(단독) 또는 `npm run all`(next dev 와 동시). `.env.local` 을 `--env-file` 로 읽는다.
 * (옛 AI 종합분석 큐 드레인은 그 파이프라인과 함께 삭제했다 — PR-5. 익숙한 실행 방법을 지키려고 파일·스크립트
 *  이름은 그대로 둔다.)
 *
 * 한 폴링 사이클: 멈춘 노트 정리 → 대기 노트 1건 claim → CLI 1회(웹 검색) → 검증 → done/failed.
 * 한 번에 1건만 처리한다(로컬 CLI 부하·비용 상한). 노트 저장소만 쓰고 판정(swing_judgments)은 건드리지 않는다.
 */

import { randomUUID } from "node:crypto";
import { detectProviders } from "@/lib/server/ai/detectCli";
import { claimNextSwingNote, failStuckSwingNotes } from "@/lib/server/swing/noteStore";
import { NOTE_TIMEOUT_MS, runSwingNote } from "@/lib/server/swing/noteRunner";

const POLL_INTERVAL_MS = 12_000;
const WORKER_ID = `worker-${randomUUID().slice(0, 8)}`;

let running = true;

function log(msg: string): void {
  console.log(`[ai-worker] ${new Date().toISOString()} ${msg}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** claude 우선, 없으면 codex. 둘 다 없으면 null — 노트는 "CLI 없음"으로 실패 처리된다. */
function pickProvider(): "claude" | "codex" | null {
  const p = detectProviders();
  if (p.claude) return "claude";
  if (p.codex) return "codex";
  return null;
}

async function loop(): Promise<void> {
  log(`기동 ${WORKER_ID} poll=${POLL_INTERVAL_MS}ms`);
  while (running) {
    try {
      // 테이블 미적용(SQL 전)·네트워크 오류는 조용히 건너뛴다.
      await failStuckSwingNotes(NOTE_TIMEOUT_MS + 2 * 60_000).catch(() => undefined);
      const note = await claimNextSwingNote(WORKER_ID).catch(() => null);
      if (note) {
        log(`swing-note id=${note.id} ticker=${note.ticker}`);
        await runSwingNote(note, pickProvider()); // throw 하지 않는다(항상 done/failed 로 닫음)
        log(`swing-note 끝 id=${note.id}`);
        continue; // 대기 노트가 더 있으면 바로 다음 건
      }
    } catch (err) {
      log(`루프 예외 — ${err instanceof Error ? err.message : String(err)}`);
    }
    await sleep(POLL_INTERVAL_MS);
  }
}

function shutdown(signal: string): void {
  log(`${signal} 수신 — 종료`);
  running = false;
  // 진행 중 노트는 CLI 타임아웃·멈춘 노트 정리(failStuckSwingNotes)에 맡긴다.
  setTimeout(() => process.exit(0), 500);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

loop().catch((err) => {
  log(`치명적 오류 — ${err instanceof Error ? err.stack : String(err)}`);
  process.exit(1);
});
