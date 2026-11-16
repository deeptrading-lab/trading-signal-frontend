import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMutationProgramImprovement, useQueryProgramImprovement } from "@/hooks/query/useQueryProgramImprovement";
import type { ApiError } from "@/lib/api/errors";

export function useProgramImprovement(sessionId: string, evaluationId?: string, applied?: boolean) {
  const router = useRouter();
  const query = useQueryProgramImprovement();
  const mutation = useMutationProgramImprovement();
  const job = query.data;
  const ownJob = job?.sessionId === sessionId && job.evaluationId === evaluationId ? job : null;
  const busy = job?.stage === "preparing" || job?.stage === "verifying";
  const completed = ownJob?.stage === "completed";

  useEffect(() => {
    if (completed && !applied) router.refresh();
  }, [completed, applied, router]);

  return {
    ownJob, busy, completed,
    pending: mutation.isPending,
    error: (mutation.error as ApiError | null)?.message,
    start: () => { if (evaluationId) mutation.mutate({ sessionId, evaluationId }); },
  };
}
