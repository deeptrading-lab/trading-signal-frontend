/**
 * prod 분석 요청(enqueue) 도메인 훅.
 *
 * prod 배포 주소에서 "AI 종합분석 요청" CTA 를 눌렀을 때의 비동기 접수 상태 머신을 담는다.
 * TanStack Query 의 mutate/isPending/reset 같은 내부 인터페이스를 노출하지 않고, 도메인 의미의
 * phase + submit/reset 으로 추상화한다. (frontend.md §2 커스텀훅 의무화)
 *
 * 상태(phase) — DESIGN.md S2~S6·S9 매핑:
 *   - idle       : 요청 전(재요청/첫요청 CTA 표시 — S2/S3).
 *   - requesting : CTA 클릭 → enqueue 응답 대기(버튼 disabled + 스피너, "요청 보내는 중…").
 *   - accepted   : { status:'queued', workerOffline:false } — 접수 배너(S4, info).
 *   - offline    : { status:'queued', workerOffline:true } — 오프라인 경고 배너(S5, warn).
 *   - duplicate  : { status:'already' } — 중복 배너(S6).
 *   - error      : enqueue 자체 실패(400/503/500/네트워크) — 실패 배너(critical 톤).
 *
 * 표시는 서버 응답 확정 후에만 전이한다(낙관적 표시 금지 — R4). 클릭~응답 사이는 requesting.
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutationEnqueueAIAnalysis } from "@/hooks/query/useMutationEnqueueAIAnalysis";

export type ProdRequestPhase =
  | "idle"
  | "requesting"
  | "accepted"
  | "offline"
  | "duplicate"
  | "error";

export interface ProdAnalysisRequest {
  /** 현재 접수 상태(상태 카드 분기). */
  phase: ProdRequestPhase;
  /** enqueue 응답 대기 중(버튼 disabled + 스피너). */
  isPending: boolean;
  /** 이 종목 분석을 요청한다(force=true 면 신선도 무시 재요청). */
  submit: (opts?: { force?: boolean }) => void;
  /** idle 로 되돌린다(배너 닫고 CTA 복귀). */
  reset: () => void;
}

export function useProdAnalysisRequest(
  ticker: string,
  /** 분석 시점 종목명(decision-stock-name) — 대기중 카드도 즉시 종목명 표시용. 큐 행에 함께 적재. */
  name?: string | null,
): ProdAnalysisRequest {
  const mutation = useMutationEnqueueAIAnalysis();
  // 서버 응답을 phase 로 확정해 보관(낙관적 표시 금지 — 응답 후에만 배너 전이).
  const [settled, setSettled] = useState<ProdRequestPhase | null>(null);

  const submit = useCallback(
    (opts?: { force?: boolean }) => {
      const target = ticker.trim();
      if (!target || mutation.isPending) return;
      setSettled(null);
      mutation.mutate(
        { ticker: target, force: opts?.force, name },
        {
          onSuccess: (data) => {
            if (data.status === "already") {
              setSettled("duplicate");
            } else if (data.workerOffline) {
              setSettled("offline");
            } else {
              setSettled("accepted");
            }
          },
          onError: () => {
            setSettled("error");
          },
        },
      );
    },
    [ticker, name, mutation],
  );

  const reset = useCallback(() => {
    setSettled(null);
    mutation.reset();
  }, [mutation]);

  const phase: ProdRequestPhase = useMemo(() => {
    if (mutation.isPending) return "requesting";
    return settled ?? "idle";
  }, [mutation.isPending, settled]);

  return {
    phase,
    isPending: mutation.isPending,
    submit,
    reset,
  };
}
