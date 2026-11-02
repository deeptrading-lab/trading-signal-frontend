import { describe, expect, it, vi } from "vitest";
import { createQuoteLoader, koreaClock, quoteFromKis } from "../liveQuotes";
import type { KisTransport } from "../kisTransport";
const now=new Date("2026-11-02T00:30:03Z");
const current={stck_prpr:"10100",temp_stop_yn:"N",lastTradeTime:"093002"};
const book={askp1:"10100",bidp1:"10090",aspr_acpt_hour:"093003",new_mkop_cls_code:"20"};
const bars=["093000","092900","092800","092700"].map((hour,index)=>({stck_bsop_date:"20261102",stck_cntg_hour:hour,stck_hgpr:index===0?"99999":"10000",cntg_vol:index===0?"200":"100"}));
describe("live quote eligibility",()=>{
 it("uses KST date and minute even on a UTC host",()=>expect(koreaClock(now)).toMatchObject({date:"20261102",minute:570,time:"093003"}));
 it("excludes the in-progress bar from the previous three-minute high",()=>expect(quoteFromKis("005930",current,book,bars,now)).toMatchObject({previousHigh:10000,volumeRatio:2,ageMs:1000,halted:false}));
 it("missing bars prevent entries but preserve the risk-management quote",()=>expect(quoteFromKis("005930",current,book,bars.slice(0,2),now)).toMatchObject({previousHigh:0,volumeRatio:0,price:10100}));
 it("counts stale last-trade time even when the order book is fresh",()=>expect(quoteFromKis("005930",{...current,lastTradeTime:"092950"},book,bars,now).ageMs).toBe(13000));
 it("does not turn missing status or future timestamps into valid data",()=>{
  expect(quoteFromKis("005930",{...current,temp_stop_yn:undefined},book,bars,now).halted).toBe(true);
  expect(quoteFromKis("005930",current,{...book,aspr_acpt_hour:"093004"},bars,now).ageMs).toBe(-1);
  expect(()=>quoteFromKis("005930",{...current,lastTradeTime:undefined},book,bars,now)).toThrow();
 });
});

it("ages earlier quotes by the time spent loading later symbols",async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date("2026-11-02T00:30:00Z"));
 try {
  const request=vi.fn(async(path:string)=>{
   vi.setSystemTime(new Date(Date.now()+2000));const time=koreaClock().time;
   if(path.includes("itemchartprice"))return {data:{output2:bars},headers:{}};
   if(path.includes("itemconclusion"))return {data:{output2:[{stck_prpr:"10100",stck_cntg_hour:time}]},headers:{}};
   if(path.includes("asking"))return {data:{output1:{...book,aspr_acpt_hour:time}},headers:{}};
   return {data:{output:current},headers:{}};
  });
  const rows=await createQuoteLoader({request} as unknown as KisTransport)(["005930","000660"]);
  expect(rows).toHaveLength(2);expect(rows[0].ageMs).toBeGreaterThan(5000);expect(rows[1].ageMs).toBeLessThanOrEqual(5000);
 }finally{vi.useRealTimers();}
});
