/* eslint-disable @typescript-eslint/no-explicit-any -- 스키마 무보증 스냅샷 JSON 을 훑는
   일회성 반사실 검증 스크립트(결론은 IMPROVEMENT-week1.md 에 기록, 재현용으로 보존).
   상시 도구인 daily.mts·today.mts 는 타입 완비. */
import fs from "node:fs";
for(const l of fs.readFileSync("/Applications/하영/code_source/trading-signal-frontend/.env.local","utf8").split("\n")){const m=l.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim().replace(/^["']|["']$/g,"");}
const { labelTick, kstMinuteStamp } = await import("@/lib/server/intraday/tickLabels");
const { deriveIntradayTimeframe } = await import("@/lib/server/paperTrading/constants");
const { fetchMinuteCandlesForDate } = await import("@/lib/api/kis/minuteChartChunked");
const { minutesOfDay } = await import("@/lib/api/kis/minuteResample");
const OUT="scripts/intraday/output/"; const DAYS=["2026-07-10","2026-07-13","2026-07-14","2026-07-15","2026-07-20"];
const cache=new Map<string,any[]>();
async function cand(day:string,tk:string,tf:number){const k=`${day}|${tk}|${tf}`;if(!cache.has(k)){try{cache.set(k,await fetchMinuteCandlesForDate(tk,day.replaceAll("-",""),tf));}catch{cache.set(k,[]);}}return cache.get(k)!;}
function fwd(cs:any[],st:string,base:number){const d=st.slice(0,10),dm=minutesOfDay(st);if(dm<0)return null;const a=cs.filter((c:any)=>c.date.slice(0,10)===d&&c.date>st&&minutesOfDay(c.date)>=dm+30);return a.length?((a[0].close-base)/base)*100:null;}
const pear=(xs:number[],ys:number[])=>{const n=xs.length;if(n<3)return null;const mx=xs.reduce((a,b)=>a+b)/n,my=ys.reduce((a,b)=>a+b)/n;let sxy=0,sxx=0,syy=0;for(let i=0;i<n;i++){const dx=xs[i]-mx,dy=ys[i]-my;sxy+=dx*dy;sxx+=dx*dx;syy+=dy*dy;}return sxx&&syy?sxy/Math.sqrt(sxx*syy):null;};
const rk=(v:number[])=>{const s=v.map((x,i)=>[x,i]).sort((a,b)=>a[0]-b[0]);const r=new Array(v.length);s.forEach(([,i],k)=>r[i as number]=k+1);return r;};
type Rec={axes:Record<string,number>,sig:number|null,conv:number|null,se:string|null,hm:string,label:string,f30:number|null,regime:number|null};
const recs:Rec[]=[];
for(const day of DAYS){const sess=JSON.parse(fs.readFileSync(OUT+`today-sessions-${day}.json`,"utf8"));const tfOf:any={},tkOf:any={};for(const s of sess){tfOf[s.id]=deriveIntradayTimeframe(s.tickIntervalMinutes);tkOf[s.id]=s.stocks?.[0]?.ticker??s.tickers[0];}
  const ticks=JSON.parse(fs.readFileSync(OUT+`today-ticks-${day}.json`,"utf8"));const v2=ticks.filter((t:any)=>t.decision.judgeSchema==="v2"&&t.decision.convictionScore!=null);
  if(v2.length<ticks.length*0.15)continue; // 대량실패일 스킵
  const bySess:any={};for(const t of v2)(bySess[t.sessionId]??=[]).push(t);
  for(const sid in bySess){const cs=await cand(day,tkOf[sid],tfOf[sid]);
    for(const t of bySess[sid]){const snap=t.decision.intradaySnapshot;const base=snap?.basePrice;if(!base)continue;const sig=snap.signal;const ax:any={};for(const a of sig.axes||[])ax[a.axis]=a.score;
      const stamp=kstMinuteStamp(t.tickWindowStart||t.pricedAt||t.createdAt);const comp=labelTick(t as any,cs as any);
      recs.push({axes:ax,sig:sig.score,conv:t.decision.convictionScore,se:snap.structureEvent,hm:stamp.slice(11),label:comp.label,f30:fwd(cs,stamp,base),regime:sig.regime??null});}}}
console.log(`풀링 v2 ${recs.length}틱\n`);
console.log("── 각 요소 vs +30분 forward return (Spearman, 양수=예측력 有) ──");
const sp=(get:(r:Rec)=>number|null)=>{const p=recs.map(r=>[get(r),r.f30]).filter(([a,b])=>a!=null&&b!=null) as [number,number][];return p.length>=3?pear(rk(p.map(x=>x[0])),rk(p.map(x=>x[1]))):null;};
for(const ax of ["trend","momentum","volume","volatility"])console.log(`  ${ax.padEnd(11)} ${sp(r=>r.axes[ax])?.toFixed(3)??"—"}`);
console.log(`  signalScore ${sp(r=>r.sig)?.toFixed(3)??"—"} · conviction ${sp(r=>r.conv)?.toFixed(3)??"—"}`);
const wr=(rs:Rec[])=>{const w=rs.filter(r=>r.label==="WIN").length,l=rs.filter(r=>r.label==="LOSS").length;return w+l?(w/(w+l)*100).toFixed(0)+"%("+w+"/"+l+")":"—";};
const avgF=(rs:Rec[])=>{const f=rs.filter(r=>r.f30!=null).map(r=>r.f30!);return f.length?(f.reduce((a,b)=>a+b)/f.length).toFixed(2):"—";};
console.log("\n── structureEvent(진입 셋업)별 승률·평균f30 ──");
const seYes=recs.filter(r=>r.se),seNo=recs.filter(r=>!r.se);
console.log(`  이벤트 있음 n=${seYes.length} 승률 ${wr(seYes)} f30 ${avgF(seYes)}% · 없음 n=${seNo.length} 승률 ${wr(seNo)} f30 ${avgF(seNo)}%`);
console.log("\n── 시간대별 ──");
for(const [lo,hi,nm] of [["09:00","11:00","오전"],["11:00","13:00","점심"],["13:00","15:30","오후"]] as const){const g=recs.filter(r=>r.hm>=lo&&r.hm<hi);console.log(`  ${nm} n=${String(g.length).padStart(4)} 승률 ${wr(g)} f30 ${avgF(g)}%`);}
