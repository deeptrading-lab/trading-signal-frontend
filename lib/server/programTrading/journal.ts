import { appendFile, readFile, writeFile } from "node:fs/promises";
import type { Trade, TradingState } from "@/lib/types/programTrading/programTrading";

type JournalEvent = { id: string; at: string; kind: "trade" | "session"; trade?: Trade; lifecycle?: TradingState["lifecycle"]; rulesVersion: string; mode: "simulation" | "toss-paper" };
// Restart-safe idempotency. Only a truncated final line from an interrupted write is recoverable.
export async function openJournal(dir: string) {
  const path = `${dir}/trades.jsonl`;
  let source = "";
  try { source = await readFile(path, "utf8"); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
  if (source && !source.endsWith("\n")) {
    const cut = source.lastIndexOf("\n") + 1;
    source = source.slice(0, cut);
    await writeFile(path, source);
  }
  const events: JournalEvent[] = source.split("\n").filter(Boolean).map(line => JSON.parse(line));
  const ids = new Set(events.map(event => event.id));
  async function append(event: JournalEvent) {
    if (ids.has(event.id)) return;
    await appendFile(path, `${JSON.stringify(event)}\n`, { mode: 0o600 });
    ids.add(event.id); events.push(event);
  }
  return {
    reconcile(state: TradingState) {
      const recordedTrades = events.flatMap(event => event.trade ? [event.trade] : []);
      const lastTrade = recordedTrades.at(-1);
      const lastLifecycle = events.filter(event => event.kind === "session").at(-1)?.lifecycle;
      if (lastLifecycle?.status === "completed" && state.lifecycle?.status !== "completed") throw new Error("종료 원장과 상태 스냅샷의 대사가 필요해요.");
      if (lastTrade && !state.trades.some(trade => trade.id === lastTrade.id)) throw new Error("원장이 상태 스냅샷보다 앞서 있어 대사 후 재시작해야 해요.");
    },
    async record(state: TradingState) {
      const mode = state.executionMode === "toss-paper" ? "toss-paper" : "simulation";
      const base = { at: state.updatedAt, rulesVersion: "program-v2", mode } as const;
      for (const trade of state.trades) await append({ ...base, id: `trade:${trade.id}`, kind: "trade", trade });
      if (state.lifecycle) await append({ ...base, id: `session:${state.lifecycle.startedAt}:${state.lifecycle.status}`, kind: "session", lifecycle: { ...state.lifecycle } });
    },
    async report(state: TradingState) {
      if (state.lifecycle?.status !== "completed") return;
      const lifecycle = state.lifecycle;
      const trades = events.flatMap(event => event.trade ? [event.trade] : []);
      const exits = trades.filter(trade => trade.side === "sell");
      const keep = lifecycle.reviewDecision === "keep";
      const proposals = keep ? [] : ["손절·익절 사유별 비용 후 손익과 재진입을 점검", "별도 미사용 기간 데이터로 비용 민감도 검증 후 변경 여부 결정"];
      const ledgerNet = exits.reduce((sum, trade) => sum + (trade.net ?? 0), 0);
      const mode = state.executionMode === "toss-paper" ? "toss-paper" : "simulation";
      const source = mode === "toss-paper" ? "토스증권 시세" : "합성 시세";
      const review = { ledgerNet, balanceChange: (lifecycle.afterBalance ?? lifecycle.beforeBalance) - lifecycle.beforeBalance, rulesVersion: "program-v2", source: "trades.jsonl", mode, lifecycle, closedTrades: exits.length, realized: state.realized, decision: lifecycle.reviewDecision, proposals, autoApply: false };
      await writeFile(`${dir}/review.json`, JSON.stringify(review, null, 2));
      await writeFile(`${dir}/review.md`, `# 자동매매 종료 복기\n\n${source} · 가상 체결.\n\n- 전 자산: ${lifecycle.beforeBalance}원\n- 후 자산: ${lifecycle.afterBalance}원\n- 비용 후 수익률: ${lifecycle.returnPct?.toFixed(3)}%\n- 목표: ${lifecycle.targetReturnPct}%\n- 판정: ${keep ? "목표 달성 · 규칙 유지 · 개선 제안 생략" : "목표 미달 · 검토 후보 생성"}\n- 원장: trades.jsonl 전체 (${trades.length}건)\n\n|거래|사유|비용 후 손익|\n|---|---|---|\n${exits.map(t => `|${t.id}|${t.reason}|${t.net}|`).join("\n")}\n\n${proposals.length ? `## 검토 가이드\n${proposals.map(p => `- ${p}`).join("\n")}\n\n규칙은 자동 변경하지 않음. 검토→수정→테스트→다이어그램 갱신 후 별도 적용.\n` : ""}`);
    },
  };
}
