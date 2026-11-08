import { httpClient } from "@/lib/api/client";
import type { Command, TradingState } from "@/lib/types/programTrading/programTrading";
export async function getProgramState() { return (await httpClient.get<TradingState>("/program-trading")).data; }
export async function sendProgramCommand(action: Command) { return (await httpClient.post<TradingState>("/program-trading",{action})).data; }
