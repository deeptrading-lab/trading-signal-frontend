import { loadCandidates } from "../lib/server/programTrading/candidates";
import { hasCandidates, emptyCandidateSnapshot } from "../lib/validation/programTrading/candidateGate";
import { createServer } from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { initialState, command, step } from "../lib/server/programTrading/engine";
import { mockQuotes } from "../lib/mock/programTrading/quotes";
import type { Command, TradingState } from "../lib/types/programTrading/programTrading";
async function main() {
const dir = ".local/program-trading";
await mkdir(dir,{recursive:true});
// One process owns this replay/account; OS bind prevents duplicate workers.
let state: TradingState = initialState();
try { const saved=JSON.parse(await readFile(`${dir}/state.json`,"utf8")); if(saved.version!==1) throw new Error("state version"); state=saved; state.running=false; state.candidates=emptyCandidateSnapshot(); } catch(e) { if ((e as NodeJS.ErrnoException).code!=="ENOENT") throw e; }
const seeds = new Map(state.positions.map(p=>[p.ticker,{ticker:p.ticker,name:p.ticker,price:p.entry}]));
async function refreshCandidates() {
  state.candidates=await loadCandidates();
  if(!hasCandidates(state.candidates)) state.running=false;
  for(const row of state.candidates.rows) if(!seeds.has(row.ticker)) seeds.set(row.ticker,row);
}
async function persist() { await writeFile(`${dir}/state.tmp`,JSON.stringify(state,null,2)); await rename(`${dir}/state.tmp`,`${dir}/state.json`); }
let queue=Promise.resolve();
function serial(fn:()=>Promise<void>) { const next=queue.then(fn); queue=next.catch(e=>{ state.running=false; state.lastError=String(e); console.error(e); }); return next; }
async function report() {
  const exits=state.trades.filter(t=>t.side==="sell");
  const text=`# 프로그램 매매 오답노트\n\n합성 시세 리플레이 · 규칙 v1 · AI 분석 전 원장 요약\n\n- 틱: ${state.tick} / 청산: ${exits.length} / 실현손익: ${state.realized}원\n- 수수료·매도세·슬리피지: 가정값. 실제 계좌와 다름.\n- 규칙 변경은 검토 후 코드·테스트로 적용. 자동 변경 없음.\n\n|거래|사유|비용후 손익|\n|---|---|---|\n${exits.map(t=>`|${t.id}|${t.reason}|${t.net}|`).join("\n")}\n\n## 다음 검토\n손절 후 재진입·갭 손실·비용 민감도·독립 거래 수·미사용 기간 검증. 합성 결과는 전략 성과 증거가 아니다.\n`;
  await writeFile(`${dir}/review.md`,text);
}
const server=createServer(async(req,res)=>{
  res.setHeader("Content-Type","application/json; charset=utf-8");
  if(req.headers.host!=="127.0.0.1:4318" || req.headers.origin) {res.writeHead(403);res.end("{}");return;}
  try {
    if(req.url!=="/state"){res.writeHead(404);res.end("{}");return;}
    if(req.method==="POST") {
      let body=""; for await(const chunk of req) {body+=chunk; if(body.length>1024) {res.writeHead(413);res.end("{}");return;}}
      const action=JSON.parse(body).action;
      if(!["start","pause","flatten"].includes(action)){res.writeHead(400);res.end("{}");return;}
      await serial(async()=>{if(action==="start") await refreshCandidates();
        if(action==="start" && !hasCandidates(state.candidates)) {
          await persist(); res.writeHead(409);res.end(JSON.stringify({error:"후보 목록이 없거나 조회할 수 없어 실행하지 않았어요."}));return;
        }
        command(state,action as Command);await persist();await report();});
      if(res.writableEnded) return;
    } else if(req.method!=="GET") {res.writeHead(405);res.end("{}");return;}
    res.end(JSON.stringify(state));
  } catch {res.writeHead(500);res.end(JSON.stringify({error:"로컬 엔진 처리 실패"}));}
});
server.listen(4318,"127.0.0.1",()=>{
  console.log("Program mock worker http://127.0.0.1:4318/state (ranked candidates only)");
  void serial(async()=>{await refreshCandidates();await persist();});
});
server.on("error",e=>{console.error(e);process.exit(1);});
// Coalesce ticks during ranking IO instead of replaying a backlog of timer callbacks.
let tickPending=false;
setInterval(()=>{
  if(tickPending)return;
  tickPending=true;
  void serial(async()=>{
    if(Date.now()-Date.parse(state.candidates.checkedAt)>=60_000) await refreshCandidates();
    if(!hasCandidates(state.candidates)) state.running=false;
    if(!state.running && !state.positions.length) { await persist(); return; }
    const tickers=new Set([...state.candidates.rows.map(c=>c.ticker),...state.positions.map(p=>p.ticker)]);
    const universe=[...seeds.values()].filter(row=>tickers.has(row.ticker));
    step(state,mockQuotes(state.tick+1,universe),state.minute+1);
    await persist();await report();
  }).finally(()=>{tickPending=false;}).catch(()=>{});
},2000);
for(const sig of ["SIGINT","SIGTERM"] as const) process.on(sig,()=>{void serial(async()=>{state.running=false;await persist();server.close(()=>process.exit(0));});});

}
void main().catch(e=>{console.error(e);process.exit(1);});
