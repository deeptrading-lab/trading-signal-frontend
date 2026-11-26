import { isTossConfigured, pickTossArray, tossGet } from "@/lib/api/toss/client";
import { isoToKstDate, isoToKstHm, kstWeekdayKo } from "@/lib/api/toss/kst";
import { PAPER_MARKET_SOURCE } from "@/lib/api/toss/paperMarketLimit";
import { getSymbolName } from "@/lib/api/kis/search";
import { getTossStockMasters } from "@/lib/api/toss/stockMaster";
import type { CandidateSnapshot, ProgramCandidate } from "@/lib/types/programTrading/programTrading";
import { RULES } from "./engine";

type RankingRow = {
  symbol?: string;
  currency?: string;
  tradingVolume?: string;
  price?: { lastPrice?: string; basePrice?: string; changeRate?: string };
};

export type PaperPrice = { price: number; at: number };

export function paperSession(now = Date.now()) {
  const iso = new Date(now).toISOString();
  const date = isoToKstDate(iso)!;
  const [hour, minute] = isoToKstHm(iso)!.split(":").map(Number);
  const midnight = Date.parse(`${date}T00:00:00+09:00`);
  return {
    date,
    minute: hour * 60 + minute,
    weekend: ["토", "일"].includes(kstWeekdayKo(date)),
    openAt: midnight + RULES.entryStart * 60_000,
    scanAt: midnight + RULES.candidateStart * 60_000,
    closeAt: midnight + RULES.closeMinute * 60_000,
  };
}

export function requireTossPaperConfig() {
  if (!isTossConfigured()) throw new Error("토스 시세용 TOSS_CLIENT_ID와 TOSS_CLIENT_SECRET을 설정해 주세요.");
}

export function emptyPaperCandidates(now = Date.now(), status: CandidateSnapshot["status"] = "unavailable"): CandidateSnapshot {
  return { status, rows: [], checkedAt: new Date(now).toISOString(), expiresAt: new Date(now + RULES.candidateIntervalMs).toISOString() };
}

export async function fetchPaperCandidates(signal: AbortSignal): Promise<CandidateSnapshot> {
  const result = await tossGet<{ rankedAt?: string; rankings?: RankingRow[] }>("/api/v1/rankings", {
    type: "MARKET_TRADING_VOLUME", marketCountry: "KR", duration: "realtime", count: RULES.rankingCount,
  }, PAPER_MARKET_SOURCE, signal);
  const now = Date.now();
  const snapshot = emptyPaperCandidates(now, "empty");
  const rankedAt = Date.parse(result?.rankedAt ?? "");
  const session = paperSession(now);
  if (!Number.isFinite(rankedAt) || rankedAt < session.openAt || rankedAt > now || !Array.isArray(result?.rankings)) return snapshot;

  const candidates: ProgramCandidate[] = [];
  for (const row of result.rankings.slice(0, RULES.rankingCount)) {
    const ticker = row?.symbol ?? "";
    const volume = Number(row?.tradingVolume);
    const price = Number(row?.price?.lastPrice);
    const previousClose = Number(row?.price?.basePrice);
    const changePercent = Number(row?.price?.changeRate) * 100;
    if (!/^[0-9][A-Z0-9]{5}$/.test(ticker) || row?.currency !== "KRW"
      || !Number.isSafeInteger(volume) || volume < RULES.minVolume
      || !Number.isSafeInteger(price) || price <= 0 || !Number.isFinite(changePercent) || changePercent <= 0) continue;
    candidates.push({
      ticker, name: getSymbolName(ticker) || ticker, price, changePercent, previousClose: previousClose > 0 ? previousClose : 0,
      sources: ["volume"], volume,
    });
  }
  candidates.sort((a, b) => b.volume! - a.volume! || a.ticker.localeCompare(b.ticker));
  let masters: Awaited<ReturnType<typeof getTossStockMasters>>;
  try {
    masters = await getTossStockMasters(candidates.map(row => row.ticker), PAPER_MARKET_SOURCE, signal);
  } catch {
    // 기업 주식인지 확인할 수 없으면 추정으로 매수하지 않는다.
    return emptyPaperCandidates(Date.now());
  }
  const unique = new Map<string, ProgramCandidate>();
  for (const row of candidates) {
    const master = masters.get(row.ticker);
    if (master?.securityType?.toUpperCase() !== "STOCK") continue;
    if (!unique.has(row.ticker)) unique.set(row.ticker, {
      ...row, name: master.name?.trim() || master.englishName?.trim() || row.name, rank: unique.size + 1,
    });
  }
  return { ...snapshot, status: unique.size ? "ready" : "empty", rankedAt: result.rankedAt, rows: [...unique.values()] };
}

export async function fetchPaperPrices(tickers: string[], signal: AbortSignal): Promise<Map<string, PaperPrice>> {
  const response = await tossGet<unknown>("/api/v1/prices", { symbols: tickers.join(",") }, PAPER_MARKET_SOURCE, signal);
  const rows = pickTossArray<{ symbol?: string; lastPrice?: string; currency?: string; timestamp?: string }>(response, "prices");
  const symbols = new Set(tickers);
  const now = Date.now();
  const { openAt } = paperSession(now);
  const result = new Map<string, PaperPrice>();
  for (const row of rows) {
    const ticker = row?.symbol ?? "";
    const price = Number(row?.lastPrice);
    const at = Date.parse(row?.timestamp ?? "");
    if (!symbols.has(ticker) || row.currency !== "KRW" || !Number.isSafeInteger(price) || price <= 0
      || !Number.isFinite(at) || at < openAt || at > now || at <= (result.get(ticker)?.at ?? 0)) continue;
    result.set(ticker, { price, at });
  }
  return result;
}
