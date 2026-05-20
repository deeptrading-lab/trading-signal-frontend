/**
 * 분석 실행 도메인 훅 — mutation 트리거·로딩·에러·결과 보관·reset 을 한 인터페이스로 묶는다.
 *
 * 화면·컴포넌트가 `useMutationAnalyzeWorkbench` (TanStack Query useMutation 래퍼) 를
 * 직접 import 하지 않도록 이 훅을 경유한다. AGENTS.md 의 "TanStack Query 인터페이스 누출 금지"
 * 룰과 `docs/rules/frontend.md` 의 커스텀훅 의무화 절을 만족.
 *
 * `useAnalyzeForm` 은 폼 상태·검증·사전 차단 책임에 집중. 본 훅은 그 결과(payload) 를
 * 받아 실제 BE 호출과 결과 보관을 책임진다 (PRD fe-conventions §9 #4 (b) 분리 선택).
 *
 * 외부 인터페이스:
 *   - submit(payload)  : 분석 호출. onSuccess 시 lastResult 에 저장
 *   - isPending        : 로딩 (mutation in-flight)
 *   - error            : ApiError | null
 *   - data             : 마지막 성공 응답 (`lastResult`)
 *   - reset()          : mutation + lastResult 초기화
 */

"use client";

import { useCallback, useState } from "react";
import { useMutationAnalyzeWorkbench } from "@/hooks/query/useMutationAnalyzeWorkbench";
import type { ApiError } from "@/lib/api/errors";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
} from "@/lib/types/workbench/analyze";

export type UseAnalyzeRunResult = {
  submit: (payload: AnalyzeRequest) => void;
  isPending: boolean;
  isError: boolean;
  error: ApiError | null;
  data: AnalyzeResponse | null;
  reset: () => void;
};

export function useAnalyzeRun(): UseAnalyzeRunResult {
  const mutation = useMutationAnalyzeWorkbench();
  const [data, setData] = useState<AnalyzeResponse | null>(null);

  const submit = useCallback(
    (payload: AnalyzeRequest) => {
      mutation.mutate(payload, {
        onSuccess: (response) => setData(response),
      });
    },
    [mutation],
  );

  const reset = useCallback(() => {
    mutation.reset();
    setData(null);
  }, [mutation]);

  return {
    submit,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error ?? null,
    data,
    reset,
  };
}
