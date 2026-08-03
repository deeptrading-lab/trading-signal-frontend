/* eslint-disable @typescript-eslint/no-explicit-any -- 스키마 무보증 스냅샷 JSON 을 훑는
   일회성 반사실 검증 스크립트(결론은 IMPROVEMENT-week1.md 에 기록, 재현용으로 보존).
   상시 도구인 daily.mts·today.mts 는 타입 완비. */
import fs from "node:fs";
for(const l of fs.readFileSync("/Applications/하영/code_source/trading-signal-frontend/.env.local","utf8").split("\n")){const m=l.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim().replace(/^["']|["']$/g,"");}
const { kstMinuteStamp } = await import("@/lib/server/intraday/tickLabels");
const { deriveIntradayTimeframe } = await import("@/lib/server/paperTrading/constants");
const { fetchMinuteCandlesForDate } = await import("@/lib/api/kis/minuteChartChunked");
const { minutesOfDay } = await import("@/lib/api/kis/minuteResample");
const OUT="scripts/intraday/output/"; const DAYS=["2026-07-10","2026-07-13","2026-07-14","2026-07-15","2026-07-20"]; const COST=0.28;
const cache=new Map<string,any[]>();
async function cand(day:string,tk:string,tf:number){const k=`${day}|${tk}|${tf}`;if(!cache.has(k)){try{cache.set(k,await fetchMinuteCandlesForDate(tk,day.replaceAll("-",""),tf));}catch{cache.set(k,[]);}}return cache.get(k)!;}
type E={day:string,tk:string,tf:number,stamp:string,entry:number,target:number,stop:number};
const entries:E[]=[];
for(const day of DAYS){const sess=JSON.parse(fs.readFileSync(OUT+`today-sessions-${day}.json`,"utf8"));const tfOf:any={},tkOf:any={};for(const s of sess){tfOf[s.id]=deriveIntradayTimeframe(s.tickIntervalMinutes);tkOf[s.id]=s.stocks?.[0]?.ticker??s.tickers[0];}
  const ticks=JSON.parse(fs.readFileSync(OUT+`today-ticks-${day}.json`,"utf8"));
  for(const t of ticks){const d=t.decision;for(const o of t.orders||[]){if(o.side!=="BUY")continue;const entry=o.price,target=d.targetPrice??d.intradaySnapshot?.levels?.tpPrice,stop=d.invalidationPrice??d.intradaySnapshot?.levels?.slPrice;if(!entry||!target||!stop||!(target>entry&&stop<entry&&stop>0))continue;entries.push({day,tk:tkOf[t.sessionId],tf:tfOf[t.sessionId],stamp:kstMinuteStamp(t.tickWindowStart||t.pricedAt||t.createdAt),entry,target,stop});}}}
for(const e of entries) await cand(e.day,e.tk,e.tf);
function fut(e:E){const cs=cache.get(`${e.day}|${e.tk}|${e.tf}`)!;return cs.filter((c:any)=>c.date.slice(0,10)===e.day&&c.date>e.stamp&&minutesOfDay(c.date)<=920);}
// 현행: 단일진입, 손절/목표/15:20
function baseline(e:E){for(const b of fut(e)){if(b.low<=e.stop)return{ret:((e.stop-e.entry)/e.entry)*100,win:false,units:1};if(b.high>=e.target)return{ret:((e.target-e.entry)/e.entry)*100,win:true,units:1};}const last=fut(e).at(-1);return last?{ret:((last.close-e.entry)/e.entry)*100,win:last.close>=e.entry,units:1}:null;}
// 물타기: 손절가 닿으면 손절 대신 동일수량 추가(avg 하향), 반등해 원진입가(E) 회복 시 전량매도.
// 루인 방어: 원진입가−2×(E−stop) 하회 시 전량 손절(더 큰 손실). 미회복 시 15:20 청산.
function marti(e:E){const f=fut(e);const floor=e.entry-2*(e.entry-e.stop);let added=false;let avg=e.entry;
  for(const b of f){
    if(!added && b.low<=e.stop){added=true;avg=(e.entry+e.stop)/2;} // 손절가서 물타기
    if(added && b.low<=floor)return{ret:((floor-avg)/avg)*100,win:false,units:2}; // 루인 손절
    const tp = added? e.entry : e.target; // 물탄 뒤엔 원진입가 회복이 목표(익절)
    if(b.high>=tp)return{ret:((tp-avg)/avg)*100,win:added?true:true,units:added?2:1};
  }
  const last=f.at(-1); if(!last)return null; return{ret:((last.close-avg)/avg)*100,win:last.close>=avg,units:added?2:1};
}
function agg(name:string,fn:(e:E)=>any){const rs=entries.map(fn).filter(Boolean);const win=rs.filter((r:any)=>r.win).length;const wr=(win/rs.length*100).toFixed(1);
  // 자본가중: units 곱해 net(=ret−COST×units) 합산
  const totNet=rs.reduce((a:number,r:any)=>a+(r.ret-COST)*r.units,0); const avgNet=rs.reduce((a:number,r:any)=>a+(r.ret-COST),0)/rs.length;
  const added=rs.filter((r:any)=>r.units===2).length;
  console.log(`${name.padEnd(18)} | 승률 ${wr.padStart(5)}% | net평균 ${(avgNet>=0?"+":"")+avgNet.toFixed(3)}% | 총net(자본가중) ${(totNet>=0?"+":"")+totNet.toFixed(1)}%p | 물탄건수 ${added}`);}
console.log(`진입 ${entries.length}건 · 비용 ${COST}%/유닛 반영\n`);
agg("현행(단일·손절)",baseline);
agg("물타기+반등매도",marti);
