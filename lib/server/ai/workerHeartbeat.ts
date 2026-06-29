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

/** 하트비트 KV 키. */
export const HEARTBEAT_KEY = "analysis:worker:heartbeat";

/**
 * 하트비트 TTL(초). 워커 갱신 주기(~20초)의 ~3배 — 한두 번 건너뛰어도 온라인 유지,
 * 워커가 죽으면 이 시간 안에 키가 만료돼 오프라인으로 전환된다.
 */
export const HEARTBEAT_TTL_SEC = 60;

/** 워커 상태 — idle(대기) / busy(분석 처리 중). */
export type WorkerStatus = "idle" | "busy";

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
