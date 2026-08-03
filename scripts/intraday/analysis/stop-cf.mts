/* eslint-disable @typescript-eslint/no-explicit-any -- 스키마 무보증 스냅샷 JSON 을 훑는
   일회성 반사실 검증 스크립트(결론은 IMPROVEMENT-week1.md 에 기록, 재현용으로 보존).
   상시 도구인 daily.mts·today.mts 는 타입 완비. */
import fs from "node:fs";
for(const l of fs.readFileSync("/Applications/하영/code_source/trading-signal-frontend/.env.local","utf8").split("\n")){const m=l.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim().replace(/^["']|["']$/g,"");}
const { kstMinuteStamp } = await import("@/lib/server/intraday/tickLabels");
const { deriveIntradayTimeframe } = await import("@/lib/server/paperTrading/constants");
const { fetchMinuteCandlesForDate } = await import("@/lib/api/kis/minuteChartChunked");
const { minutesOfDay } = await import("@/lib/api/kis/minuteResample");
const OUT="scripts/intraday/output/";
const DAYS=["2026-07-10","2026-07-13","2026-07-14","2026-07-15","2026-07-20"];
const cache=new Map<string,any[]>();
async function cand(day:string,tk:string,tf:number){const k=`${day}|${tk}|${tf}`;if(!cache.has(k)){try{cache.set(k,await fetchMinuteCandlesForDate(tk,day.replaceAll("-",""),tf));}catch{cache.set(k,[]);}}return cache.get(k)!;}
type Stop={day:string,tk:string,tf:number,sellStamp:string,entry:number,target:number,stop:number|null};
const stops:Stop[]=[];
for(const day of DAYS){
  const sess=JSON.parse(fs.readFileSync(OUT+`today-sessions-${day}.json`,"utf8"));
  const tfOf:Record<string,number>={}; const tkOf:Record<string,string>={};
  for(const s of sess){tfOf[s.id]=deriveIntradayTimeframe(s.tickIntervalMinutes);tkOf[s.id]=s.stocks?.[0]?.ticker??s.tickers[0];}
  const ticks=JSON.parse(fs.readFileSync(OUT+`today-ticks-${day}.json`,"utf8"));
  const bySess:Record<string,any[]>={}; for(const t of ticks)(bySess[t.sessionId]??=[]).push(t);
  for(const sid in bySess){
    const list=bySess[sid].sort((a,b)=>a.tickIndex-b.tickIndex); const q:any[]=[];
    for(const t of list){const d=t.decision;
      for(const o of t.orders||[]){
        if(o.side==="BUY")q.push({entry:o.price,target:d.targetPrice??d.intradaySnapshot?.levels?.tpPrice??null,stop:d.invalidationPrice??d.intradaySnapshot?.levels?.slPrice??null});
        else{const e=q.shift()||{};const stamp=kstMinuteStamp(t.tickWindowStart||t.pricedAt||t.createdAt);const hm=stamp.slice(11);
          if((o.realizedPnl||0)<0 && hm<"15:20" && e.target){stops.push({day,tk:tkOf[sid],tf:tfOf[sid],sellStamp:stamp,entry:e.entry,target:e.target,stop:e.stop});}
        }
      }
    }
  }
}
let premature=0,breakeven=0,keptFalling=0,noData=0; const mfeList:number[]=[];
for(const s of stops){
  const cs=await cand(s.day,s.tk,s.tf); const dm=minutesOfDay(s.sellStamp);
  const after=cs.filter((c:any)=>c.date.slice(0,10)===s.day && c.date>s.sellStamp && minutesOfDay(c.date)>=0 && minutesOfDay(c.date)<=920);
  if(after.length===0){noData++;continue;}
  const maxHigh=Math.max(...after.map((c:any)=>c.high));
  const mfePct=((maxHigh-s.entry)/s.entry)*100; mfeList.push(mfePct);
  if(maxHigh>=s.target)premature++;
  else if(maxHigh>=s.entry)breakeven++;
  else keptFalling++;
}
const n=premature+breakeven+keptFalling;
console.log(`손절 트레이드 ${stops.length}건 (분봉 있는 ${n}건 분석, 데이터없음 ${noData})\n`);
console.log(`손절 후 세션 내 가격 경로:`);
console.log(`  ① 목표가 도달(조기손절 명백)  ${premature} (${(premature/n*100).toFixed(0)}%)`);
console.log(`  ② 진입가 회복(부분 조기)      ${breakeven} (${(breakeven/n*100).toFixed(0)}%)`);
console.log(`  ③ 계속 하락(손절 정당)         ${keptFalling} (${(keptFalling/n*100).toFixed(0)}%)`);
const avgMfe=mfeList.reduce((a,b)=>a+b,0)/mfeList.length;
console.log(`\n손절 후 평균 최대상승폭(MFE) ${avgMfe.toFixed(2)}% (진입가 대비) — 양수 클수록 조기손절 시사`);
