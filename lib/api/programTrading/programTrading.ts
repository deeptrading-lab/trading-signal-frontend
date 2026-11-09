import { httpClient } from "@/lib/api/client";
import type { ProgramTradingAction, TradingState } from "@/lib/types/programTrading/programTrading";
export async function getProgramState() { return (await httpClient.get<TradingState>("/program-trading")).data; }
export async function sendProgramCommand(action: ProgramTradingAction) { return (await httpClient.post<TradingState>("/program-trading",{action})).data; }
