import { performance } from "node:perf_hooks";
import { command, initialState, step } from "../lib/server/programTrading/engine";
import { mockQuotes } from "../lib/mock/programTrading/quotes";
const start=performance.now();
let trades=0;
for (let run=0; run<300; run++) {
  const s=initialState(); const epoch=Date.now();
  s.candidates={status:"ready", rows:[{ticker:"005930",name:"benchmark",price:70000,changePercent:1,previousClose:60000,sources:["volume"]}], checkedAt:new Date(epoch).toISOString(),expiresAt:new Date(epoch+120000).toISOString()};
  command(s,"start");
  for(let t=1;t<=371;t++) {
    const now=epoch+t*1000;
    s.candidates.checkedAt=new Date(now).toISOString(); s.candidates.expiresAt=new Date(now+120000).toISOString();
    step(s,mockQuotes(t,s.candidates.rows,now),550+Math.floor(t/60),Math.floor(now/60000),now);
  }
  trades+=s.trades.length;
}
const ms=performance.now()-start;
console.log(JSON.stringify({evaluations:111300,trades,totalMs:Math.round(ms),averageMicroseconds:ms*1000/111300,scope:"1 synthetic symbol; runtime benchmark only, not a profitability backtest; excludes IO and provider latency"}));
