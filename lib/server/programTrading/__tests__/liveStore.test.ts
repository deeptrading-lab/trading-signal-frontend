import { describe,it,expect } from "vitest";
import { mkdtemp,appendFile,readFile,rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createLiveStore } from "../liveStore";
import { initialLiveState } from "../liveEngine";
import type { LiveBroker } from "../liveTypes";
describe("live order WAL",()=>{
 it("recovers the last synced intention and drops an interrupted tail",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"live-trades-"));
  try {
   const store=await createLiveStore(dir);const state=initialLiveState({mode:"vts",accountKey:"hash",accountMasked:"****1234",maxOrderKrw:10000} as LiveBroker);
   state.live.orders.push({clientId:"unique",ticker:"005930",side:"buy",quantity:1,price:1000,reason:"breakout",id:null,organization:"",status:"intent",filledQuantity:0,filledAmount:0,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
   await store.commit(state,"order-intent");state.live.orders=[];
   await appendFile(join(dir,"live.jsonl"),'{"partial":');
   const recovered=await createLiveStore(dir);expect((await recovered.load())?.live.orders[0].status).toBe("intent");
   expect((await readFile(join(dir,"live.jsonl"),"utf8")).endsWith("\n")).toBe(true);
  }finally{await rm(dir,{recursive:true,force:true});}
 });
});

it("fails closed on a corrupt complete journal line", async()=>{
 const dir=await mkdtemp(join(tmpdir(),"live-corrupt-"));
 try {
  const store=await createLiveStore(dir);
  const state=initialLiveState({mode:"vts",accountKey:"hash",accountMasked:"****1234",maxOrderKrw:10000} as LiveBroker);
  await store.commit(state,"account-state");
  await appendFile(join(dir,"live.jsonl"),"corrupt-complete-line\n");
  await expect(createLiveStore(dir)).rejects.toThrow();
 }finally{await rm(dir,{recursive:true,force:true});}
});

it("does not copy broker credentials into persisted recovery state",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"live-no-credentials-"));
 const secret="test-secret-must-not-be-journaled";
 try {
  const store=await createLiveStore(dir);
  const broker={mode:"vts",accountKey:"hash",accountMasked:"****1234",maxOrderKrw:10000,credentials:{appSecret:secret}} as unknown as LiveBroker;
  await store.commit(initialLiveState(broker),"account-state");
  const content=await readFile(join(dir,"live.jsonl"),"utf8");
  expect(content).not.toContain(secret);expect(content).not.toContain("appSecret");
  expect((await store.load())?.live.accountKey).toBe("hash");
 }finally{await rm(dir,{recursive:true,force:true});}
});
