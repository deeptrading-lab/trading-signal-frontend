/**
 * prod 분석 워커 활동 상태 도메인 훅 (S7 처리 중 뱃지).
 *
 * worker-status 폴링(`useQueryWorkerStatus`) 응답을 화면이 바로 그릴 수 있는 파생 모델
 * `{ kind, queueDepth }` 로 환원한다. 뱃지 컴포넌트는 query 훅을 직접 보지 않고 이 도메인 훅의
 * `kind` 만 분기한다. (frontend.md §2 커스텀훅 의무화)
 *
 * 파생 규칙(순수 함수 `deriveWorkerActivity` — 단위테스트 대상):
 *   - online · busy            → processing (+ queueDepth)
 *   - online · idle · 대기>0   → queued     (적재됐으나 아직 미점유 — 전이 구간)
 *   - online · idle · 대기==0  → hidden     (할 일 없음 → 뱃지 숨김)
 *   - offline                  → offline    (선제 안내)
 *   - 데이터 없음(첫 로딩/비활성/에러로 미수신) → hidden (fail-soft, 잘못된 안내 금지)
 *
 * 직전 성공값(react-query `data`)을 우선 본다 — 일시적 폴링 실패에 뱃지가 깜빡이지 않게(sticky).
 */

"use client";

import { useMemo } from "react";
import { useQueryWorkerStatus } from "@/hooks/query/useQueryWorkerStatus";
import type { WorkerStatusResponse } from "@/lib/types/stock/analysisQueue";

/** 뱃지 표시 분기. hidden 이면 아무것도 렌더하지 않는다. */
export type WorkerActivityKind = "hidden" | "processing" | "queued" | "offline";

export interface WorkerActivity {
  kind: WorkerActivityKind;
  /** 현재 대기(pending) 건수 — processing/queued 일 때 "· 대기 N건" 표기에 사용. */
  queueDepth: number;
}

const HIDDEN: WorkerActivity = { kind: "hidden", queueDepth: 0 };

/** worker-status 응답 → 뱃지 파생 모델. data 미수신(undefined)이면 숨김. */
export function deriveWorkerActivity(
  data: WorkerStatusResponse | undefined,
): WorkerActivity {
  if (!data) return HIDDEN;
  if (!data.online) return { kind: "offline", queueDepth: 0 };
  const queueDepth = Math.max(0, data.queueDepth ?? 0);
  if (data.status === "busy") return { kind: "processing", queueDepth };
  if (queueDepth > 0) return { kind: "queued", queueDepth };
  return HIDDEN;
}

export function useWorkerActivity(enabled = true): WorkerActivity {
  const { data } = useQueryWorkerStatus(enabled);
  return useMemo(() => deriveWorkerActivity(data), [data]);
}
