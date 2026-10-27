export type Command = "start" | "pause" | "flatten";
export type Reason = "breakout" | "stop" | "target" | "close" | "kill" | "manual";
export type Quote = { ticker: string; name: string; price: number; previousHigh: number; volumeRatio: number; spreadBps: number; ageMs: number; halted: boolean };
export type Position = { ticker: string; quantity: number; entry: number; mark: number };
export type Trade = { id: string; minute: number; ticker: string; side: "buy" | "sell"; quantity: number; price: number; fee: number; reason: Reason; net: number | null };
export type TradingState = { version: 1; candidates: CandidateSnapshot; running: boolean; killed: boolean; tick: number; minute: number; cash: number; initial: number; equity: number; realized: number; positions: Position[]; trades: Trade[]; quotes: Quote[]; cooldown: Record<string, number>; updatedAt: string; lastError: string | null };

export type CandidateSource = "volume" | "foreign" | "institution";
export type ProgramCandidate = { ticker: string; name: string; price: number; sources: CandidateSource[] };
export type CandidateSnapshot = {
  status: "ready" | "empty" | "unavailable";
  rows: ProgramCandidate[];
  checkedAt: string;
  expiresAt: string;
};
