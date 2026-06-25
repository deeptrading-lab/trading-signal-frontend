import { httpClient } from "@/lib/api/client";
import type {
  CreatePaperTradingSessionRequest,
  CreatePaperTradingSessionResponse,
  PaperTradingSessionResponse,
  PaperTradingSessionsResponse,
  PatchPaperTradingSessionRequest,
  RunPaperTradingTickRequest,
} from "@/lib/types/paperTrading/paperTrading";

export async function fetchPaperTradingSessions(): Promise<PaperTradingSessionsResponse> {
  const response = await httpClient.get<PaperTradingSessionsResponse>(
    "/paper-trading/sessions",
  );
  return response.data;
}

export async function createPaperTradingSession(
  payload: CreatePaperTradingSessionRequest,
): Promise<CreatePaperTradingSessionResponse> {
  const response = await httpClient.post<CreatePaperTradingSessionResponse>(
    "/paper-trading/sessions",
    payload,
  );
  return response.data;
}

export async function fetchPaperTradingSession(
  sessionId: string,
): Promise<PaperTradingSessionResponse> {
  const response = await httpClient.get<PaperTradingSessionResponse>(
    `/paper-trading/sessions/${sessionId}`,
  );
  return response.data;
}

export async function patchPaperTradingSession(
  sessionId: string,
  payload: PatchPaperTradingSessionRequest,
): Promise<PaperTradingSessionResponse> {
  const response = await httpClient.patch<PaperTradingSessionResponse>(
    `/paper-trading/sessions/${sessionId}`,
    payload,
  );
  return response.data;
}

export async function runPaperTradingTick(
  sessionId: string,
  payload: RunPaperTradingTickRequest = {},
): Promise<PaperTradingSessionResponse> {
  const response = await httpClient.post<PaperTradingSessionResponse>(
    `/paper-trading/sessions/${sessionId}/tick`,
    payload,
  );
  return response.data;
}
