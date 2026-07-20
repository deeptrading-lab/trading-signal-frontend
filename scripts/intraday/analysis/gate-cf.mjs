import fs from "node:fs";
const OUT="scripts/intraday/output/";
// regime 정상일만(픽스 후)
const DAYS=["2026-07-14","2026-07-15","2026-07-20"];
// FIFO로 buy→sell 페어링, 진입 틱의 conviction/regime 귀속
const trades=[]; // {conv, regime, pnl, provider}
for(const day of DAYS){
  const sess=JSON.parse(fs.readFileSync(OUT+`today-sessions-${day}.json`,"utf8"));
  const provOf={}; for(const s of sess) provOf[s.id]=s.aiProvider==="codex"?"codex":"claude";
  const ticks=JSON.parse(fs.readFileSync(OUT+`today-ticks-${day}.json`,"utf8"));
  // 세션별 시간순
  const bySess={}; for(const t of ticks){(bySess[t.sessionId]??=[]).push(t);}
  for(const sid in bySess){
    const list=bySess[sid].sort((a,b)=>(a.tickIndex-b.tickIndex));
    const queue=[]; // 진입 대기 {conv,regime}
    for(const t of list){
      const d=t.decision;
      for(const o of t.orders||[]){
        if(o.side==="BUY"){queue.push({conv:d.convictionScore??null, regime:d.intradaySnapshot?.signal?.regime??null});}
        else{ // SELL — 가장 오래된 진입에 귀속(FIFO)
          const entry=queue.shift()||{conv:null,regime:null};
          trades.push({conv:entry.conv, regime:entry.regime, pnl:o.realizedPnl||0, provider:provOf[sid]||"claude"});
        }
      }
    }
  }
}
const sum=a=>a.reduce((x,y)=>x+y.pnl,0);
const wr=a=>{const w=a.filter(t=>t.pnl>0).length,l=a.filter(t=>t.pnl<0).length;return w+l?(w/(w+l)*100).toFixed(1):"—";};
const fmt=n=>Math.round(n).toLocaleString();
console.log(`regime 정상 3일(7/14·15·20) 트레이드 ${trades.length}건\n`);
// 진입 유형 분류
const isNeutralHi=t=>t.regime===0 && t.conv!=null && t.conv>=65;
const all=trades, gated=trades.filter(t=>!isNeutralHi(t)), removed=trades.filter(isNeutralHi);
console.log(`[현행 전체]        n=${String(all.length).padStart(3)} · 승률 ${wr(all)}% · 손익 ${fmt(sum(all))}원`);
console.log(`[중립≥65 게이트]   n=${String(gated.length).padStart(3)} · 승률 ${wr(gated)}% · 손익 ${fmt(sum(gated))}원`);
console.log(`  └ 제거된 중립≥65: n=${removed.length} · 승률 ${wr(removed)}% · 손익 ${fmt(sum(removed))}원`);
console.log(`\n개선폭: 손익 ${fmt(sum(gated)-sum(all))}원 · 승률 ${wr(all)}%→${wr(gated)}%`);
// 참고: 진입 conviction 분포
const withConv=trades.filter(t=>t.conv!=null);
console.log(`\n(참고) 진입 ${trades.length}건 중 conviction 있는 진입 ${withConv.length} · 그중 ≥65 ${withConv.filter(t=>t.conv>=65).length}(중립 ${trades.filter(isNeutralHi).length}·강세 ${withConv.filter(t=>t.conv>=65&&t.regime===1).length})`);
