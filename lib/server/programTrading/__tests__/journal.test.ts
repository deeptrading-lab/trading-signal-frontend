import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { openJournal } from "../journal";
import { initialState } from "../engine";

describe("persistent trading journal", () => {
 it("retains earlier records across snapshot trimming/restart and skips proposals when target met", async () => {
  const dir=await mkdtemp(join(tmpdir(),"program-journal-"));
  try {
   const s=initialState(); const journal=await openJournal(dir);
   s.trades=[{id:"first",minute:600,ticker:"005930",side:"sell",quantity:1,price:100,fee:1,reason:"target",net:5}];
   await journal.record(s); await journal.record(s);
   const restarted=await openJournal(dir); s.trades=[];
   s.lifecycle={status:"completed",startedAt:"2026-11-01T00:00:00Z",finishedAt:"2026-11-01T01:00:00Z",beforeBalance:100,afterBalance:102,returnPct:2,targetReturnPct:1,reviewDecision:"keep"};
   await restarted.record(s); await restarted.report(s);
   const review=JSON.parse(await readFile(join(dir,"review.json"),"utf8"));
   expect(review.closedTrades).toBe(1); expect(review.proposals).toEqual([]); expect(review.autoApply).toBe(false);
   expect((await readFile(join(dir,"trades.jsonl"),"utf8")).trim().split("\n")).toHaveLength(2);
   s.lifecycle.reviewDecision="review"; await restarted.report(s);
   expect(JSON.parse(await readFile(join(dir,"review.json"),"utf8")).proposals.length).toBeGreaterThan(0);
  } finally { await rm(dir,{recursive:true,force:true}); }
 });
});

it("blocks restart if journal contains a same-tick fill missing from the snapshot", async () => {
 const dir=await mkdtemp(join(tmpdir(),"program-journal-"));
 try {
  const s=initialState();s.tick=5;
  const journal=await openJournal(dir);
  s.trades=[{id:"5-005930-sell",minute:600,ticker:"005930",side:"sell",quantity:1,price:100,fee:1,reason:"manual",net:0}];
  await journal.record(s);s.trades=[];
  const reopened=await openJournal(dir);expect(()=>reopened.reconcile(s)).toThrow(/대사/);
 } finally { await rm(dir,{recursive:true,force:true}); }
});
