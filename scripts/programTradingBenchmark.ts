import { performance } from "node:perf_hooks";
import { command, initialState, step } from "../lib/server/programTrading/engine";
import { mockQuotes } from "../lib/mock/programTrading/quotes";
const start=performance.now();
let trades=0;
for(let run=0;run<300;run++) {const s=initialState();s.candidates={status:"ready",rows:[{ticker:"005930",name:"benchmark",price:70000,sources:["volume"]}],checkedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+120000).toISOString()};command(s,"start");for(let t=1;t<=371;t++)step(s,mockQuotes(t,s.candidates.rows),550+t);trades+=s.trades.length;}
const ms=performance.now()-start;
console.log(JSON.stringify({evaluations:111300,trades,totalMs:Math.round(ms),averageMicroseconds:ms*1000/111300,scope:"3 synthetic symbols; rule evaluation only, excludes IO and KIS latency"}));
