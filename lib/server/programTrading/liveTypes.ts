import type { Command, Quote, Reason, TradingState } from "@/lib/types/programTrading/programTrading";
export type LiveMode = "prod" | "vts";
export type BrokerHolding = { ticker: string; quantity: number; averagePrice: number; mark: number };
export type BrokerAccount = { totalFees?: number; equity: number; cash: number; availableCash: number; holdings: BrokerHolding[]; complete: boolean; checkedAt: string };
export type BrokerOrder = {
 id: string; organization: string; ticker: string; side: "buy" | "sell";
 quantity: number; filledQuantity: number; filledAmount: number; averagePrice: number;
 status: "open" | "partial" | "filled" | "cancelled" | "rejected";
 date: string; time: string;
};
export type BrokerOrders = { rows: BrokerOrder[]; complete: boolean };
export type MarketSession = { date: string; minute: number; open: boolean; tradingDay: boolean };
export type OrderIntent = { clientId: string; ticker: string; side: "buy" | "sell"; quantity: number; price: number; reason: Reason };
export type LiveOrder = OrderIntent & { id: string | null; organization: string; status: BrokerOrder["status"] | "intent" | "unknown" | "cancelling"; filledQuantity: number; filledAmount: number; createdAt: string; updatedAt: string };
export type LiveMetadata = {
 startBlockReason?: string; marketCheckedAt?: string; accountKey: string; accountMasked: string; date: string; orders: LiveOrder[];
 lastReconciledAt: string | null; balanceFresh: boolean; depositWithdrawalDetected: boolean;
 feeDays?: Record<string, number>; baselineFees?: number; maxOrderKrw: number; baselineOrderIds: string[]; recoveryRequired: boolean;
};
export type LiveState = TradingState & { executionMode: LiveMode; live: LiveMetadata };
export interface LiveBroker {
 mode: LiveMode;
 accountKey: string;
 accountMasked: string;
 maxOrderKrw: number;
 account(): Promise<BrokerAccount>;
 orders(date: string): Promise<BrokerOrders>;
 submit(intent: OrderIntent): Promise<{ id: string; organization: string }>;
 cancel(order: BrokerOrder): Promise<void>;
 quotes(tickers: string[]): Promise<Quote[]>;
 session(): Promise<MarketSession>;
}
export type LivePersist = (state: LiveState, event?: { kind: string; [key: string]: unknown }) => Promise<void>;
export type LiveCommand = Command;
