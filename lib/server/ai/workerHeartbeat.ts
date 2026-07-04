/**
 * 로컬 분석 워커 하트비트 — KV(Upstash) 기반 온라인/오프라인 신호. (PRD analysis-request-queue §3-2/§3-4)
 *
 * 워커(`scripts/analysisWorker.ts`)가 폴링마다 `writeHeartbeat` 로 TTL 을 갱신하고,
 * enqueue·worker-status BFF 가 `readHeartbeat` 로 워커 생존을 판정한다.
 * TTL 이 freshness 를 대신한다 — 키가 살아 있으면(TTL 내) 온라인, 만료/부재면 오프라인.
 *
 * ⚠️ 워커와 Next 서버는 **별도 프로세스**라 하트비트는 반드시 **공유 store(KV)** 를 거쳐야 한다.
 *   `KIS_TOKEN_STORE=kv`(Upstash) 가 prod·로컬 양쪽에 설정돼야 cross-process 로 동작한다.
 *   memory store(미설정)면 프로세스 간 공유가 안 돼 항상 오프라인으로 보인다(운영 메모: PRD §8-4).
 */

import { getKisStore } from "@/lib/api/kis/store";
import type { AnalysisWorkerStatus } from "@/lib/types/stock/analysisQueue";

/** 하트비트 KV 키. */
export const HEARTBEAT_KEY = "analysis:worker:heartbeat";

/**
 * 하트비트 TTL(초). 워커 갱신 주기(~20초)의 ~3배 — 한두 번 건너뛰어도 온라인 유지,
 * 워커가 죽으면 이 시간 안에 키가 만료돼 오프라인으로 전환된다.
 */
export const HEARTBEAT_TTL_SEC = 60;

/** 워커 상태 — idle(대기) / busy(분석 처리 중). 값 SSOT = `AnalysisWorkerStatus`(공유 타입). */
export type WorkerStatus = AnalysisWorkerStatus;

export interface WorkerHeartbeat {
  /** 마지막 갱신 시각(epoch ms). */
  ts: number;
  status: WorkerStatus;
  /** 현재 pending 큐 깊이(관측용). */
  queueDepth: number;
}

/** 워커가 폴링마다 호출 — 하트비트 TTL 갱신(fail-soft, store 가 에러·타임아웃 흡수). */
export async function writeHeartbeat(hb: WorkerHeartbeat): Promise<void> {
  await getKisStore().set(HEARTBEAT_KEY, hb, HEARTBEAT_TTL_SEC);
}

/** BFF 가 호출 — 하트비트가 있으면(TTL 내) 워커 온라인, 없으면 null(오프라인). */
export async function readHeartbeat(): Promise<WorkerHeartbeat | null> {
  return getKisStore().get<WorkerHeartbeat>(HEARTBEAT_KEY);
}

// ── 워커별(per-worker) 하트비트 ──────────────────────────────────────────────
// 전역 키(위)는 "아무 워커나 온라인인가"(UI 판정)만 답할 수 있어, **특정** 워커의 생사를 모른다.
// recoverStuck 이 stuck processing 행을 **즉시** 복구하려면 그 행을 claim 한 워커가 죽었는지
// 개별로 알아야 한다 → 워커마다 자기 id 를 접미한 별도 키에 하트비트를 병행 기록한다.
// (전역 키는 그대로 유지 — 워커는 두 키를 함께 쓴다.)

/** 워커별 하트비트 KV 키 — 전역 키에 workerId 를 접미(`analysis:worker:heartbeat:worker-xxxx`). */
export function workerHeartbeatKey(workerId: string): string {
  return `${HEARTBEAT_KEY}:${workerId}`;
}

/**
 * 워커가 폴링마다 호출 — **자기** workerId 키의 TTL 갱신(전역 `writeHeartbeat` 와 병행).
 * 전역 키와 같은 TTL 을 쓴다 — 워커가 죽으면 이 시간(≤60s) 안에 만료돼 사망으로 판정된다. fail-soft.
 */
export async function writeWorkerHeartbeat(
  workerId: string,
  hb: WorkerHeartbeat,
): Promise<void> {
  await getKisStore().set(workerHeartbeatKey(workerId), hb, HEARTBEAT_TTL_SEC);
}

/**
 * recoverStuck 가 호출 — 해당 워커의 하트비트를 읽어 **생존**을 판정한다.
 * - 값 반환(TTL 내) → 워커 **살아있음**.
 * - `null` → 키 부재/만료 = 워커 **사망**(정상 store 응답).
 * - **throw** → store 도달 실패(타임아웃·에러)로 정당한 miss 와 구별 불가 = 판정 불가(INDETERMINATE).
 *   recoverStuck 이 이를 잡아 사망으로 **오판하지 않고**(라이브 행 오복구 방지) 시간 컷오프로만 폴백한다.
 *
 * ⚠️ store.get 은 fail-soft(에러·타임아웃을 null 로 흡수)라, 여기서 `wasLastCallDegraded()` 로
 *   '정당한 miss(=사망)' 과 'store 장애(=판정 불가)' 를 갈라 **후자만** throw 로 승격한다
 *   (fail-safe, not fail-open — KV 오류를 죽음으로 오판해 건강한 분석을 이중 처리하는 사고를 막는다).
 */
export async function readWorkerHeartbeat(
  workerId: string,
): Promise<WorkerHeartbeat | null> {
  const store = getKisStore();
  const hb = await store.get<WorkerHeartbeat>(workerHeartbeatKey(workerId));
  // ⚠️ 옵셔널 메서드 계약: `wasLastCallDegraded` 를 **구현하지 않은** store 는 `?.()` 가 undefined(falsy)라
  //   throw 를 건너뛰고 null 을 그대로 돌려준다. degrade 를 **실제로 겪을 수 있는** store 가 이 메서드를
  //   빠뜨리면 fail-safe 가 조용히 fail-open 으로 뒤집혀(KV 장애→'사망' 오판→라이브 행 이중 처리) 사고가 난다.
  //   → degrade 가능 store(UpstashKisStore 등)는 이 메서드를 **절대 제거하면 안 된다**. 절대 degrade 하지
  //   않는 store(MemoryKisStore)만 미구현 허용 — 그때 null 은 언제나 정당한 miss(=사망)다.
  if (hb === null && store.wasLastCallDegraded?.()) {
    throw new Error(`worker heartbeat 조회 degrade(생존 판정 불가) workerId=${workerId}`);
  }
  return hb;
}

/**
 * graceful shutdown(SIGINT/SIGTERM) 시 호출 — 자기 하트비트 키를 즉시 삭제한다.
 * 정상 재기동 시 이 워커가 잡고 있던 processing 행을 TTL(≤60s) 만료를 기다리지 않고 즉시 복구시킨다.
 * best-effort — 실패해도 TTL 이 폴백. fail-soft.
 */
export async function deleteWorkerHeartbeat(workerId: string): Promise<void> {
  await getKisStore().del(workerHeartbeatKey(workerId));
}
