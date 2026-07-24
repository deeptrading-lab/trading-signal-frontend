import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/query/queryKeys";
import { respondToAutopilotGuide } from "@/lib/api/paperTrading/autopilot";
import type { AutopilotGuideResponseKind } from "@/lib/types/paperTrading/autopilot";

type Variables = {
  runId: string;
  guideId: string;
  response: AutopilotGuideResponseKind;
};

export function useMutationRespondAutopilotGuide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, guideId, response }: Variables) =>
      respondToAutopilotGuide(runId, guideId, response),
    meta: { skipGlobalErrorToast: true },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.paperTrading.autopilot });
    },
  });
}
