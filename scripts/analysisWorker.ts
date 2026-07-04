/**
 * 로컬 분석 워커 — prod 에서 적재된 분석 요청 큐(ai_analysis_queue)를 폴링으로 드레인한다.
 * (PRD analysis-request-queue §3-4)
 *
 * 실행: `npm run analyze:worker`(단독) 또는 `npm run all`(next dev 와 동시).
 *   `next dev` 와 **별개 프로세스**. Supabase·KV env(.env.local)가 `--env-file` 로 로드돼야 한다.
 *
 * 한 폴링 사이클:
 *   1) recoverStuck(20분) — 죽은 워커가 processing 에 남긴 row 복구(1회 재투입 후 failed, §9 q2).
 *   2) 여유 슬롯(WORKER_CONCURRENCY, 기본 3)만큼 claimNextPending 으로 pending 을 FIFO 로 집어
 *      **병렬** 처리한다. 전역 세마포어(=3)가 하드 캡이라 실제 동시 실행은 그 이하.
 *   3) 각 작업: provider 자동선택(claude 우선, 없으면 codex) → 로컬 분석 핸들러를 HTTP 로 호출하고
 *      SSE 를 {type:'done'} 까지 **끝까지 소비**(중간에 끊으면 AbortController 로 분석·저장 중단) →
 *      성공 markDone / 실패 markFailed. 슬롯 가득(429)이면 백오프 재시도.
 *   4) 슬롯 꽉 참 → 하나 끝날 때까지 대기(Promise.race). 큐 비었으면 짧게 sleep.
 * 별도 타이머로 하트비트를 주기 갱신(분석 중에도 끊기지 않게) → worker-status 가 온라인으로 본다.
 *
 * ⚠️ SSE 를 done 까지 소비해야 핸들러 내부 upsertAIDecision 이 실행된다(A6/AC-3).
 */

import { randomUUID } from "node:crypto";
import {
  claimNextPending,
  getQueueDepth,
  isAnalysisQueueStoreConfigured,
  markDone,
  markFailed,
  recoverStuck,
} from "@/lib/server/ai/queueStore";
import { detectProviders } from "@/lib/server/ai/detectCli";
import {
  deleteWorkerHeartbeat,
  writeHeartbeat,
  writeWorkerHeartbeat,
  type WorkerStatus,
} from "@/lib/server/ai/workerHeartbeat";
import type { AnalysisQueueRow } from "@/lib/types/stock/analysisQueue";

const BASE_URL =
  process.env.WORKER_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_MS ?? 12_000);
const HEARTBEAT_INTERVAL_MS = Number(process.env.WORKER_HEARTBEAT_MS ?? 20_000);
const STUCK_TIMEOUT_MS = 20 * 60_000; // 20분(PRD §9 q2)
/** 분석 핸들러가 429(전역 세마포어 가득)일 때 재시도 — 브라우저·봇이 슬롯을 비울 때까지 대기. */
const MAX_BUSY_RETRIES = 40;
const BUSY_RETRY_MS = 15_000;
const WORKER_ID = `worker-${randomUUID().slice(0, 8)}`;
/**
 * 워커가 **동시에** 드레인하는 최대 작업 수(기본 3). 전역 세마포어(concurrencyGate, =3)가 여전히
 * 하드 캡이라 이 값이 커도 실제 동시 실행은 3을 못 넘는다. 로컬/봇과 슬롯을 나눠 쓰려면 낮춘다.
 */
const WORKER_CONCURRENCY = Math.max(1, Number(process.env.WORKER_CONCURRENCY ?? 3));

let running = true;
/** 현재 병렬 처리 중인 작업 프라미스 집합 — 동시성 제어 + busy 하트비트 판정. */
const inFlight = new Set<Promise<void>>();

/** 전역 세마포어 가득(429) — 재시도 가능 신호. */
class BusyError extends Error {}

function log(msg: string): void {
  console.log(`[analysis-worker] ${new Date().toISOString()} ${msg}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** claude 우선, 없으면 codex. 둘 다 없으면 null. */
function pickProvider(): "claude" | "codex" | null {
  const p = detectProviders();
  if (p.claude) return "claude";
  if (p.codex) return "codex";
  return null;
}

/**
 * 분석 핸들러를 HTTP 로 호출하고 SSE 를 done 까지 끝까지 소비한다. 429 면 BusyError.
 * jobId·source:'prod' 를 동봉 — 핸들러가 이미 claim 한 queue 행을 **재사용**(중복 행 방지, owned=false)하고
 * 종결(markDone/markFailed)은 워커가 한다(unified-analysis-jobs §3-4 G4).
 */
async function runAnalysis(
  ticker: string,
  provider: "claude" | "codex",
  jobId: number,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/stock/ai-analysis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticker, provider, jobId, source: "prod" }),
  });
  if (res.status === 429) throw new BusyError("전역 동시성 가득(429)");
  if (!res.ok || !res.body) throw new Error(`분석 핸들러 HTTP ${res.status}`);

  // SSE 스트림을 끝까지 읽는다 — 본문 소비가 서버 파이프라인(upsertAIDecision 포함) 완료의 전제.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let sawDone = false;
  let tail = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    tail += decoder.decode(value, { stream: true });
    if (tail.includes('"type":"done"')) sawDone = true;
    // 메모리 누적 방지 — done 마커 탐지에 필요한 꼬리만 유지.
    if (tail.length > 16_384) tail = tail.slice(-4_096);
  }
  if (!sawDone) throw new Error("분석 스트림이 done 없이 종료됨");
}

async function beat(): Promise<void> {
  const status: WorkerStatus = inFlight.size > 0 ? "busy" : "idle";
  const queueDepth = await getQueueDepth();
  const hb = { ts: Date.now(), status, queueDepth };
  // 두 키를 함께 기록: 전역 키(UI '워커 온라인' 판정) + 워커별 키(recoverStuck 의 이 워커 생존 판정).
  //   둘 다 fail-soft(store 가 에러·타임아웃 흡수)라 Promise.all 은 reject 하지 않는다.
  await Promise.all([writeHeartbeat(hb), writeWorkerHeartbeat(WORKER_ID, hb)]);
}

/** 이미 claim 된 작업 1건을 종결까지 처리한다. **절대 throw 하지 않음**(항상 markDone/markFailed). */
async function processClaimedJob(job: AnalysisQueueRow): Promise<void> {
  log(`claim id=${job.id} ticker=${job.ticker}`);
  try {
    const provider = pickProvider();
    if (!provider) {
      await markFailed(job.id, "사용 가능한 AI CLI(claude/codex)가 없습니다.");
      log(`fail id=${job.id} — provider 없음`);
      return;
    }
    log(`analyze id=${job.id} ticker=${job.ticker} provider=${provider}`);

    // 429(전역 세마포어 가득)면 백오프 후 같은 job 재시도(이미 점유 중이라 남이 안 건드림).
    let attempt = 0;
    for (;;) {
      try {
        await runAnalysis(job.ticker, provider, job.id);
        break;
      } catch (err) {
        if (err instanceof BusyError && attempt < MAX_BUSY_RETRIES) {
          attempt += 1;
          log(`busy(429) id=${job.id} — ${attempt}/${MAX_BUSY_RETRIES} 대기`);
          await sleep(BUSY_RETRY_MS);
          continue;
        }
        throw err;
      }
    }

    await markDone(job.id);
    log(`done id=${job.id} ticker=${job.ticker}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await markFailed(job.id, msg);
    log(`fail id=${job.id} — ${msg}`);
  }
}

async function loop(): Promise<void> {
  if (!isAnalysisQueueStoreConfigured()) {
    log("⚠ Supabase(ai_analysis_queue) 미설정 — 큐를 읽을 수 없어요. .env.local 확인 후 재기동하세요.");
  }
  log(`기동 ${WORKER_ID} base=${BASE_URL} concurrency=${WORKER_CONCURRENCY} poll=${POLL_INTERVAL_MS}ms`);
  while (running) {
    try {
      await recoverStuck(STUCK_TIMEOUT_MS);

      // 여유 슬롯만큼 pending 을 FIFO(created_at asc)로 집어 **병렬** 시작.
      while (running && inFlight.size < WORKER_CONCURRENCY) {
        const job = await claimNextPending(WORKER_ID);
        if (!job) break; // 큐 비었음
        const p = processClaimedJob(job).finally(() => {
          inFlight.delete(p);
        });
        inFlight.add(p);
      }
      await beat().catch(() => undefined);

      if (inFlight.size === 0) {
        // 큐 비었고 진행 중 없음 → 폴 간격 대기.
        await sleep(POLL_INTERVAL_MS);
      } else if (inFlight.size >= WORKER_CONCURRENCY) {
        // 슬롯 꽉 참 → 하나 끝나면 위 while 이 재claim(끝날 때까지 대기).
        await Promise.race(inFlight);
      } else {
        // 진행 중이지만 여유 있음(큐가 비어 못 채움) → 새 pending 폴 또는 완료 중 먼저 오는 것까지 대기.
        await Promise.race([...inFlight, sleep(POLL_INTERVAL_MS)]);
      }
    } catch (err) {
      log(`루프 예외 — ${err instanceof Error ? err.message : String(err)}`);
      await sleep(POLL_INTERVAL_MS);
    }
  }
}

// 분석 중에도 하트비트가 끊기지 않게 별도 타이머로 주기 갱신.
const heartbeatTimer = setInterval(() => {
  beat().catch(() => undefined); // fail-soft
}, HEARTBEAT_INTERVAL_MS);

async function shutdown(signal: string): Promise<void> {
  log(`${signal} 수신 — 종료`);
  running = false;
  clearInterval(heartbeatTimer);
  // graceful shutdown — 워커별 하트비트를 즉시 삭제해, 정상 재기동 시 이 워커가 잡고 있던 processing
  //   행을 TTL(≤60s) 만료를 기다리지 않고 recoverStuck 이 곧장 복구하게 한다. best-effort(실패는 흡수).
  await deleteWorkerHeartbeat(WORKER_ID).catch(() => undefined);
  // 진행 중 분석은 핸들러 타임아웃에 맡기고 잠시 후 빠져나간다.
  setTimeout(() => process.exit(0), 500);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

loop().catch((err) => {
  log(`치명적 오류 — ${err instanceof Error ? err.stack : String(err)}`);
  process.exit(1);
});
