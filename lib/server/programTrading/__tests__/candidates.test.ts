import { describe, expect, it, vi } from "vitest";
import { loadCandidates, mergeCandidates } from "../candidates";
import { mockQuotes } from "@/lib/mock/programTrading/quotes";
import { hasCandidates } from "@/lib/validation/programTrading/candidateGate";
const samsung={ticker:"005930",name:"삼성전자",price:70000};
const hynix={ticker:"000660",name:"SK하이닉스",price:180000};
const naver={ticker:"035420",name:"NAVER",price:200000};
const deps={ready:()=>true,volume:async()=>[samsung],flow:async(subject:"frgn"|"orgn")=>subject==="frgn"?[samsung,hynix]:[naver],wait:async()=>{}};
describe("ranking candidate admission",()=>{
 it("unions volume and foreign/institution rankings with source provenance",()=>{expect(mergeCandidates([samsung],[samsung,hynix],[naver])).toEqual([{...samsung,sources:["volume","foreign"]},{...hynix,sources:["foreign"]},{...naver,sources:["institution"]}]);});
 it("does not invent fallback symbols for empty universe",async()=>{expect(mockQuotes(1)).toEqual([]);const snapshot=await loadCandidates({...deps,volume:async()=>[],flow:async()=>[]});expect(snapshot.status).toBe("empty");expect(snapshot.rows).toEqual([]);expect(hasCandidates(snapshot)).toBe(false);});
 it("fails closed on any source request failure without retaining old rows",async()=>{const snapshot=await loadCandidates({...deps,flow:async()=>{throw Error("offline");}});expect(snapshot.status).toBe("unavailable");expect(snapshot.rows).toEqual([]);});
 it("never fetches when credentials/ranking environment are unavailable",async()=>{const volume=vi.fn();const snapshot=await loadCandidates({...deps,ready:()=>false,volume});expect(volume).not.toHaveBeenCalled();expect(snapshot.rows).toEqual([]);});
 it("expires the union and only generates quotes for its symbols",async()=>{const snapshot=await loadCandidates(deps);const now=Date.parse(snapshot.checkedAt);expect(hasCandidates(snapshot,now)).toBe(true);expect(hasCandidates(snapshot,now+120000)).toBe(false);expect(mockQuotes(1,snapshot.rows).map(q=>q.ticker)).toEqual(snapshot.rows.map(q=>q.ticker));});
 it("excludes invalid prices and deduplicates within a source",()=>{expect(mergeCandidates([samsung,samsung,{...hynix,price:NaN}],[],[])).toEqual([{...samsung,sources:["volume"]}]);});
});
