import { httpClient } from "@/lib/api/client";
import type { PaperImprovementJob } from "@/lib/types/programTrading/programTrading";

const path = "/program-trading/improvement";

export async function getImprovementJob() {
  return (await httpClient.get<PaperImprovementJob | null>(path)).data;
}

export async function requestImprovement(input: { sessionId: string; evaluationId: string }) {
  return (await httpClient.post<PaperImprovementJob>(path, input)).data;
}
