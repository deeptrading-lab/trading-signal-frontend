/* eslint-disable @typescript-eslint/no-explicit-any -- 스키마 무보증 스냅샷 JSON 을 훑는
   일회성 반사실 검증 스크립트(결론은 IMPROVEMENT-week1.md 에 기록, 재현용으로 보존).
   상시 도구인 daily.mts·today.mts 는 타입 완비. */
import fs from "node:fs";
for(const l of fs.readFileSync("/Applications/하영/code_source/trading-signal-frontend/.env.local","utf8").split("\n")){const m=l.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim().replace(/^["']|["']$/g,"");}
const { kstMinuteStamp } = await import("@/lib/server/intraday/tickLabels");
const { deriveIntradayTimeframe } = await import("@/lib/server/paperTrading/constants");
const { fetchMinuteCandlesForDate } = await import("@/lib/api/kis/minuteChartChunked");
const { minutesOfDay } = await import("@/lib/api/kis/minuteResample");
const OUT="scripts/intraday/output/"; const DAYS=["2026-07-10","2026-07-13","2026-07-14","2026-07-15","2026-07-20"];
const COST=0.28; // 왕복 거래비용 %
const cache=new Map<string,any[]>();
async function cand(day:string,tk:string,tf:number){const k=`${day}|${tk}|${tf}`;if(!cache.has(k)){try{cache.set(k,await fetchMinuteCandlesForDate(tk,day.replaceAll("-",""),tf));}catch{cache.set(k,[]);}}return cache.get(k)!;}
type E={day:string,tk:string,tf:number,stamp:string,entry:number,target:number,stop:number};
const entries:E[]=[];
for(const day of DAYS){
  const sess=JSON.parse(fs.readFileSync(OUT+`today-sessions-${day}.json`,"utf8"));
  const tfOf:Record<string,number>={},tkOf:Record<string,string>={};
  for(const s of sess){tfOf[s.id]=deriveIntradayTimeframe(s.tickIntervalMinutes);tkOf[s.id]=s.stocks?.[0]?.ticker??s.tickers[0];}
  const ticks=JSON.parse(fs.readFileSync(OUT+`today-ticks-${day}.json`,"utf8"));
  for(const t of ticks){const d=t.decision;
    for(const o of t.orders||[]){if(o.side!=="BUY")continue;
      const entry=o.price, target=d.targetPrice??d.intradaySnapshot?.levels?.tpPrice, stop=d.invalidationPrice??d.intradaySnapshot?.levels?.slPrice;
      if(!entry||!target||!stop||!(target>entry&&stop<entry&&stop>0))continue;
      entries.push({day,tk:tkOf[t.sessionId],tf:tfOf[t.sessionId],stamp:kstMinuteStamp(t.tickWindowStart||t.pricedAt||t.createdAt),entry,target,stop});
    }
  }
}
// 진입별 분봉 프리페치
for(const e of entries) await cand(e.day,e.tk,e.tf);
function simulate(e:E,slMult:number){ // slMult=Infinity → 무손절
  const cs=cache.get(`${e.day}|${e.tk}|${e.tf}`)!; const dm=minutesOfDay(e.stamp);
  const sl = slMult===Infinity? -Infinity : e.entry-(e.entry-e.stop)*slMult;
  const fut=cs.filter((c:any)=>c.date.slice(0,10)===e.day&&c.date>e.stamp&&minutesOfDay(c.date)<=920);
  for(const b of fut){
    if(b.low<=sl) return {ret:((sl-e.entry)/e.entry)*100, win:false};       // 손절 우선(보수)
    if(b.high>=e.target) return {ret:((e.target-e.entry)/e.entry)*100, win:true}; // 익절
  }
  const last=fut.at(-1); if(!last) return null;
  return {ret:((last.close-e.entry)/e.entry)*100, win:last.close>=e.entry};   // 15:20 청산
}
console.log(`진입 ${entries.length}건 · 왕복비용 ${COST}% 반영\n`);
console.log(`손절폭     | 청산승률 | 평균수익% | net평균% | 총net(합)`);
for(const [m,lbl] of [[1.0,"현행(1.0×)"],[1.5,"1.5× 넓게"],[2.0,"2.0× 넓게"],[3.0,"3.0× 넓게"],[Infinity,"무손절"]] as const){
  const rs=entries.map(e=>simulate(e,m)).filter(Boolean) as {ret:number,win:boolean}[];
  const win=rs.filter(r=>r.win).length; const wr=(win/rs.length*100).toFixed(1);
  const avg=rs.reduce((a,r)=>a+r.ret,0)/rs.length; const net=avg-COST;
  const totNet=rs.reduce((a,r)=>a+r.ret-COST,0);
  console.log(`${String(lbl).padEnd(11)}| ${wr.padStart(6)}% | ${(avg>=0?"+":"")+avg.toFixed(3)} | ${(net>=0?"+":"")+net.toFixed(3)} | ${(totNet>=0?"+":"")+totNet.toFixed(1)}%p`);
}
console.log(`\n(청산승률=목표도달 or 15:20 종가≥진입 / net=거래비용 차감 / 총net=진입당 net 합산)`);
