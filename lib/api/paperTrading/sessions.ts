import { httpClient } from "@/lib/api/client";
import type {
  CreatePaperTradingSessionRequest,
  CreatePaperTradingSessionResponse,
  CompletePaperTradingPortfolioResponse,
  PaperTradingSessionHistoryResponse,
  PaperTradingSessionResponse,
  PaperTradingSessionsResponse,
  PatchPaperTradingSessionRequest,
  RunPaperTradingTickRequest,
} from "@/lib/types/paperTrading/paperTrading";

export async function completePaperTradingPortfolio(
  portfolioId: string,
): Promise<CompletePaperTradingPortfolioResponse> {
  const response = await httpClient.post<CompletePaperTradingPortfolioResponse>(
    `/paper-trading/portfolios/${encodeURIComponent(portfolioId)}/complete`,
  );
  return response.data;
}

export async function fetchPaperTradingSessions(): Promise<PaperTradingSessionsResponse> {
  const response = await httpClient.get<PaperTradingSessionsResponse>(
    "/paper-trading/sessions",
  );
  return response.data;
}

/**
 * 과거 모의투자 내역 1페이지 — 인메모리 원장(최근 20건)이 아니라 Supabase 저장본을 직접 읽는다.
 * 서버가 limit(상한 100)·offset(상한 5,000)을 clamp 하고, offset 상한에 닿으면 hasMore 를 내린다.
 */
export async function fetchPaperTradingSessionHistory(params: {
  limit?: number;
  offset: number;
}): Promise<PaperTradingSessionHistoryResponse> {
  const response = await httpClient.get<PaperTradingSessionHistoryResponse>(
    "/paper-trading/sessions/history",
    { params },
  );
  return response.data;
}

export async function createPaperTradingSession(
  payload: CreatePaperTradingSessionRequest,
): Promise<CreatePaperTradingSessionResponse> {
  const response = await httpClient.post<CreatePaperTradingSessionResponse>(
    "/paper-trading/sessions",
    payload,
    // 생성은 서버가 첫 틱(분봉 페치 + CLI 에이전트 콜, 재시도 포함)을 동기 완료 후 응답 —
    // 공용 30초 타임아웃이면 성공 중에도 클라만 끊겨 재클릭 중복 생성을 유발한다(리뷰 #6).
    { timeout: 120_000 },
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
    // 틱도 LLM 판단(직렬화 대기 포함)이 30초를 넘을 수 있다 — 생성과 동일 사유로 상향.
    { timeout: 120_000 },
  );
  return response.data;
}
