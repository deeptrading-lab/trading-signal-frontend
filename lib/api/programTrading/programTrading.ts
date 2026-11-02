import { httpClient } from "@/lib/api/client";
import type { AccountInput, AccountStatus, Command, TradingState } from "@/lib/types/programTrading/programTrading";
export async function getProgramState() { return (await httpClient.get<TradingState>("/program-trading")).data; }
export async function sendProgramCommand(action: Command) { return (await httpClient.post<TradingState>("/program-trading",{action})).data; }

export async function getProgramAccount() { return (await httpClient.get<AccountStatus>("/program-trading/account")).data; }
export async function connectProgramAccount(input: AccountInput) { return (await httpClient.post<AccountStatus>("/program-trading/account", input)).data; }
