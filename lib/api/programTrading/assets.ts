import { httpClient } from "@/lib/api/client";
import type { ProgramAssets } from "@/lib/types/programTrading/assets";

export async function getProgramAssets(signal?: AbortSignal) {
  return (await httpClient.get<ProgramAssets>("/program-trading/assets", { signal })).data;
}
export async function updateProgramAssets(amount: number) {
  return (await httpClient.post<ProgramAssets>("/program-trading/assets", { amount })).data;
}
