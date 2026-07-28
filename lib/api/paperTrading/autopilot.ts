import { httpClient } from "@/lib/api/client";
import type {
  AutopilotRunResponse,
  AutopilotGuideResponseKind,
  PatchAutopilotRunRequest,
  StartAutopilotRunRequest,
} from "@/lib/types/paperTrading/autopilot";

export async function fetchAutopilotRun(): Promise<AutopilotRunResponse> {
  const response = await httpClient.get<AutopilotRunResponse>("/paper-trading/autopilot");
  return response.data;
}

export async function startAutopilotRun(
  payload: StartAutopilotRunRequest = {},
): Promise<AutopilotRunResponse> {
  const response = await httpClient.post<AutopilotRunResponse>(
    "/paper-trading/autopilot",
    payload,
  );
  return response.data;
}

export async function stopAutopilotRun(
  runId: string,
  options: { completeChildSessions?: boolean } = {},
): Promise<{ run: AutopilotRunResponse["run"] }> {
  const payload: PatchAutopilotRunRequest = {
    status: "stopped",
    completeChildSessions: options.completeChildSessions,
  };
  const response = await httpClient.patch<{ run: AutopilotRunResponse["run"] }>(
    `/paper-trading/autopilot/${runId}`,
    payload,
  );
  return response.data;
}

export async function respondToAutopilotGuide(
  runId: string,
  guideId: string,
  responseKind: AutopilotGuideResponseKind,
): Promise<{ run: AutopilotRunResponse["run"] }> {
  const payload: PatchAutopilotRunRequest = {
    guideResponse: { guideId, response: responseKind },
  };
  const response = await httpClient.patch<{ run: AutopilotRunResponse["run"] }>(
    `/paper-trading/autopilot/${runId}`,
    payload,
  );
  return response.data;
}
