import { describe, expect, it } from "vitest";
import type { PaperSessionReview, Trade } from "@/lib/types/programTrading/programTrading";
const RULES_VERSION = "program-v5-short-exposure";
const RULES = { fee: .00015, sellTax: .002, stop: .008, target: .01, maxPositions: 1, entryStart: 550, entryEnd: 870, cooldown: 10, slippage: .0005 };
import { auditPaperSession, type JournalEvent } from "../reviewAudit";

const legacyVersion = "program-v4-volume-positive";
const entry = 10_000;
const quantity = 100;
function fixture(exitPrice: number, reason: "stop" | "target", version = RULES_VERSION, minute = 600, overrides: Record<string, number> = {}) {
  const rules = { ...RULES, ...overrides };
  const cost = entry * quantity;
  const buyFee = Math.ceil(cost * rules.fee);
  const sellFee = Math.ceil(exitPrice * quantity * (rules.fee + rules.sellTax));
  const net = exitPrice * quantity - sellFee - cost - buyFee;
  const observedAt = Date.parse("2026-11-19T01:00:00Z");
  const evidence = { quote: { ticker: "005930", name: "삼성전자", price: exitPrice, previousHigh: 9_900, volumeRatio: 2, spreadBps: 1, ageMs: 0, halted: false }, candidateCheckedAt: new Date(observedAt).toISOString(), rules, observedAt };
  const buy: Trade = { id: "buy", minute, ticker: "005930", side: "buy", quantity, price: entry, fee: buyFee, reason: "breakout", net: null, ...(version === RULES_VERSION ? { evidence } : {}) };
  const sell: Trade = { id: "sell", minute: minute + 1, ticker: "005930", side: "sell", quantity, price: exitPrice, fee: sellFee, reason, net, ...(version === RULES_VERSION ? { evidence } : {}) };
  const events: JournalEvent[] = [buy, sell].map((trade, index) => ({ id: String(index), at: new Date(observedAt + index * 60_000).toISOString(), kind: "trade", trade, rulesVersion: version, mode: "toss-paper" }));
  const beforeBalance = 10_000_000;
  const afterBalance = beforeBalance + net;
  const review: PaperSessionReview = { lifecycle: { status: "completed", startedAt: events[0].at, finishedAt: events[1].at, beforeBalance, afterBalance, returnPct: (afterBalance / beforeBalance - 1) * 100, targetReturnPct: 1, reviewDecision: "review" }, balanceChange: net, ledgerNet: net, realized: net, closedTrades: 1, decision: "review", proposals: [] };
  return { review, events };
}
const audit = (input: ReturnType<typeof fixture>) => auditPaperSession(input.review, input.events, "fixture");

describe("규칙 버전별 종료 감사", () => {
  it.each(["program-v6-volume-basket", "program-v7-afternoon-close"])("%s 원장은 비용 0과 거래량 매수 기준을 보존한다", version => {
    const input = fixture(10_200, "target", version, 600, { fee: 0, sellTax: 0 });
    input.events[0].trade!.reason = "volume-rank";
    expect(audit(input).issues).toEqual([]);
  });
  it("v4의 gross -1% 손절을 새 순손익 기준으로 바꾸지 않는다", () => {
    expect(audit(fixture(Math.floor(entry * .99 * (1 - RULES.slippage)), "stop", legacyVersion)).issues).toEqual([]);
  });
  it("v4는 새 순손절에 도달해도 기존 gross -1% 미달이면 오류다", () => {
    expect(audit(fixture(9_940, "stop", legacyVersion)).issues.some(issue => issue.evidence.includes("손절·익절"))).toBe(true);
  });
  it("v4의 gross +2% 익절과 14:57 진입을 보존한다", () => {
    expect(audit(fixture(Math.floor(entry * 1.02 * (1 - RULES.slippage)), "target", legacyVersion, 897)).issues).toEqual([]);
  });
  it("v4는 새로운 순익절 +1%에 도달해도 기존 +2% 미달이면 오류다", () => {
    const result = audit(fixture(10_150, "target", legacyVersion));
    expect(result.issues.some(issue => issue.evidence.includes("손절·익절"))).toBe(true);
  });
  it("v5의 비용 후 +1% 익절을 gross +2% 미달이어도 인정한다", () => {
    expect(audit(fixture(10_150, "target")).issues).toEqual([]);
  });
  it("v5의 gross 상승만 있고 비용 후 목표 미달이면 오류다", () => {
    expect(audit(fixture(10_100, "target")).issues.some(issue => issue.evidence.includes("손절·익절"))).toBe(true);
  });
  it("v5 순손절 기준을 적용한다", () => {
    expect(audit(fixture(9_940, "stop")).issues).toEqual([]);
    expect(audit(fixture(9_960, "stop")).issues.some(issue => issue.evidence.includes("손절·익절"))).toBe(true);
  });
  it("당시 기록된 규칙을 현행 상수보다 우선한다", () => {
    expect(audit(fixture(10_150, "target", RULES_VERSION, 600, { target: .02 })).issues.some(issue => issue.evidence.includes("손절·익절"))).toBe(true);
  });
  it("새 진입 마감 이후 v5 매수는 감사 오류다", () => {
    expect(audit(fixture(10_150, "target", RULES_VERSION, 897)).issues.some(issue => issue.evidence.includes("매수 시각"))).toBe(true);
  });
});
