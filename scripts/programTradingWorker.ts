import { openJournal } from "../lib/server/programTrading/journal";
import { createCandidateRefresh } from "../lib/server/programTrading/candidateRefresh";
import { loadCandidates } from "../lib/server/programTrading/candidates";
import { hasCandidates, emptyCandidateSnapshot } from "../lib/validation/programTrading/candidateGate";
import { createServer } from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { initialState, command, step } from "../lib/server/programTrading/engine";
import { mockQuotes } from "../lib/mock/programTrading/quotes";
import type { Command, TradingState } from "../lib/types/programTrading/programTrading";
async function replayMain() {
const dir = ".local/program-trading";
await mkdir(dir,{recursive:true});
// One process owns this replay/account; OS bind prevents duplicate workers.
let state: TradingState = { ...initialState(), executionMode: "replay" };
try { const saved=JSON.parse(await readFile(`${dir}/state.json`,"utf8")); if(saved.version!==1) throw new Error("state version"); state=saved; state.executionMode="replay";state.running=false; state.candidates=emptyCandidateSnapshot(); } catch(e) { if ((e as NodeJS.ErrnoException).code!=="ENOENT") throw e; }
const journal = await openJournal(dir);
journal.reconcile(state);
const seeds = new Map(state.positions.map(p=>[p.ticker,{ticker:p.ticker,name:p.ticker,price:p.entry}]));
async function persist() { await journal.record(state); await writeFile(`${dir}/state.tmp`,JSON.stringify(state,null,2)); await rename(`${dir}/state.tmp`,`${dir}/state.json`); }
let queue=Promise.resolve();
function serial(fn:()=>Promise<void>) { const next=queue.then(fn); queue=next.catch(e=>{ state.running=false; state.lastError=String(e); console.error(e); }); return next; }
const refreshCandidates = createCandidateRefresh(loadCandidates, snapshot => serial(async () => {
  state.candidates = snapshot;
  if (!hasCandidates(snapshot)) state.running = false;
  for (const row of snapshot.rows) if (!seeds.has(row.ticker)) seeds.set(row.ticker, row);
  await persist();
}));
async function report() { await journal.report(state); }
let commandVersion = 0;
const server=createServer(async(req,res)=>{
  res.setHeader("Content-Type","application/json; charset=utf-8");
  if(req.headers.host!=="127.0.0.1:4318" || req.headers.origin) {res.writeHead(403);res.end("{}");return;}
  try {
    if ((req.url === "/logs" || req.url === "/review") && req.method === "GET") {
      const file = req.url === "/logs" ? "trades.jsonl" : "review.json";
      res.setHeader("Content-Type", req.url === "/logs" ? "application/x-ndjson; charset=utf-8" : "application/json; charset=utf-8");
      try { res.end(await readFile(`${dir}/${file}`, "utf8")); } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") { res.writeHead(404);res.end(JSON.stringify({error:"아직 생성된 기록이 없어요."})); } else throw e; }
      return;
    }
    if(req.url!=="/state"){res.writeHead(404);res.end("{}");return;}
    if(req.method==="POST") {
      let body=""; for await(const chunk of req) {body+=chunk; if(body.length>1024) {res.writeHead(413);res.end("{}");return;}}
      const action=JSON.parse(body).action;
      if(!["start","pause","flatten"].includes(action)){res.writeHead(400);res.end("{}");return;}
      const requestVersion = ++commandVersion;
      if (action === "start") await refreshCandidates();
      await serial(async()=>{
        if (action === "start" && requestVersion !== commandVersion) {
          res.writeHead(409);res.end(JSON.stringify({error:"더 최근의 운용 명령이 있어 시작 요청을 취소했어요."}));return;
        }
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
  void refreshCandidates().catch(console.error);
});
server.on("error",e=>{console.error(e);process.exit(1);});
// Ranking requests run independently; slow network IO must not block position checks.
const candidateTimer = setInterval(() => { void refreshCandidates().catch(console.error); }, 60_000);
// Coalesce ticks during local processing instead of replaying a backlog of timer callbacks.
let tickPending=false;
const tradingTimer = setInterval(()=>{
  if(tickPending)return;
  tickPending=true;
  void serial(async()=>{
    if(!hasCandidates(state.candidates)) state.running=false;
    if(!state.running && !state.positions.length) { await persist(); await report(); return; }
    const tickers=new Set([...state.candidates.rows.map(c=>c.ticker),...state.positions.map(p=>p.ticker)]);
    const universe=[...seeds.values()].filter(row=>tickers.has(row.ticker));
    step(state,mockQuotes(state.tick+1,universe),state.minute+1);
    await persist();await report();
  }).finally(()=>{tickPending=false;}).catch(()=>{});
},2000);
for(const sig of ["SIGINT","SIGTERM"] as const) process.on(sig,()=>{clearInterval(candidateTimer);clearInterval(tradingTimer);void serial(async()=>{state.running=false;await persist();server.close(()=>process.exit(0));});});

}


async function liveMain() {
 const { koreaClock } = await import("../lib/server/programTrading/liveQuotes");
 const { createLiveEngine, initialLiveState } = await import("../lib/server/programTrading/liveEngine");
 const { createLiveStore } = await import("../lib/server/programTrading/liveStore");
 const { createKisBroker, loadKisCandidates } = await import("../lib/server/programTrading/kisBroker");
 const { getProgramCredentials, getProgramAccount, connectProgramAccount, validateAccountInput } = await import("../lib/server/programTrading/account");
 type Engine = ReturnType<typeof createLiveEngine>;
 let engine: Engine | null = null;
 let store: Awaited<ReturnType<typeof createLiveStore>> | null = null;
 let directory = "";
 let queue = Promise.resolve();
 let initialized = false;
 let candidateLoad: (() => ReturnType<typeof loadKisCandidates>) | null = null;
 let commandVersion = 0;
 function serial<T>(fn: () => Promise<T>): Promise<T> {
  const next=queue.then(fn);
  queue=next.then(()=>undefined,()=>undefined);
  return next;
 }
 async function configure() {
  const credentials = await getProgramCredentials();
  const broker = createKisBroker(credentials);
  directory = `.local/program-trading/live/${broker.accountKey}`;
  store = await createLiveStore(directory);
  const previous = await store.load();
  const restored = previous?.lifecycle?.status==="completed"&&previous.live.date!==koreaClock().date?null:previous;
  engine = createLiveEngine(broker, async(state,event)=>{ await store!.commit(state,event?.kind??"state",event); },restored??initialLiveState(broker));
  candidateLoad=()=>loadKisCandidates(credentials);
  await engine.recover();
  await engine.readiness(true);
 }
 async function refresh() {
  if(!candidateLoad||!engine)return;
  const load=candidateLoad;const target=engine;
  const candidates=await load();
  await serial(async()=>{if(engine!==target)return;engine.state.candidates=candidates;if(!hasCandidates(candidates))engine.state.running=false;await store!.commit(engine.state,"candidates");});
 }
 async function report() {
  if(!engine||!store||engine.state.lifecycle?.status!=="completed")return;
  const state=engine.state;
  const events=await store.events();
  const trades=new Map(events.filter(event=>event.state.lifecycle?.startedAt===state.lifecycle?.startedAt).flatMap(event=>event.state.trades).map(trade=>[trade.id,trade]));
  const keep=state.lifecycle?.reviewDecision==="keep";
  const review={mode:state.executionMode,sessionDate:state.live.date,rulesVersion:"program-live-v1",source:"live.jsonl",lifecycle:state.lifecycle,closedTrades:[...trades.values()].filter(t=>t.side==="sell").length,trades:[...trades.values()],feeStatus:"개별 체결 비용은 미확정 · 최종 수익률은 증권사 계좌 평가자산 기준",decision:state.lifecycle?.reviewDecision,proposals:keep?[]:["체결 지연·부분체결·취소 경합과 진입/청산 사유별 성과를 검토", "실제 비용과 미사용 거래일을 대조한 후 규칙 변경 여부 결정"],autoApply:false};
  await writeFile(`${directory}/review.tmp`,JSON.stringify(review,null,2),{mode:0o600});await rename(`${directory}/review.tmp`,`${directory}/review.json`);
  await writeFile(`${directory}/review.md`, `# 자동매매 종료 복기\n\n- 거래일: ${state.live.date}\n- 환경: ${state.executionMode}\n- 전 잔액: ${state.lifecycle?.beforeBalance}\n- 후 잔액: ${state.lifecycle?.afterBalance}\n- 수익률: ${state.lifecycle?.returnPct}%\n- 판정: ${keep?"목표 달성 · 규칙 유지 · 개선 제안 생략":"목표 미달 · 검토 가이드 생성"}\n\n${review.proposals.map(p=>`- ${p}`).join("\n")}\n\n전체 체결 근거는 live.jsonl 및 review.json 참조. 개별 체결 비용은 미확정. 자동 규칙 변경 없음.\n`,{mode:0o600});
 }
 const server=createServer(async(req,res)=>{
  res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");
  if(req.headers.host!=="127.0.0.1:4318"||req.headers.origin){res.writeHead(403);res.end("{}");return;}
  if(!initialized){res.writeHead(503);res.end(JSON.stringify({error:"계좌 엔진을 준비하고 있어요."}));return;}
  try {
   if(req.url==="/account"&&req.method==="GET") {res.end(JSON.stringify(await getProgramAccount()));return;}
   if(req.url==="/account"&&req.method==="POST") {
    let body="";for await(const chunk of req){body+=chunk;if(body.length>16384){res.writeHead(413);res.end("{}");return;}}
    const input=JSON.parse(body);
    if(!validateAccountInput(input)){res.writeHead(400);res.end(JSON.stringify({error:"계좌 입력값을 확인해 주세요."}));return;}
    ++commandVersion;
    const result=await serial(async()=>{
     const s=engine?.state;
     if(s&&(s.positions.length||s.live.orders.some(o=>!["filled","cancelled","rejected"].includes(o.status))||(s.lifecycle&&s.lifecycle.status!=="completed")))throw new Error("운용 또는 미체결이 남아 있어 계좌를 바꿀 수 없어요.");
     const result=await connectProgramAccount(input);await configure();return result;
    });
    void refresh().catch(()=>{});res.end(JSON.stringify(result));return;
   }
   if(!engine){res.writeHead(503);res.end(JSON.stringify({error:"한투 계좌를 연결해 주세요."}));return;}
   if(req.method==="GET"&&(req.url==="/logs"||req.url==="/review")) {
    const file=req.url==="/logs"?"live.jsonl":"review.json";
    if(req.url==="/logs")res.setHeader("Content-Type","application/x-ndjson; charset=utf-8");
    try {res.end(await readFile(`${directory}/${file}`,"utf8"));}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;res.writeHead(404);res.end(JSON.stringify({error:"아직 생성된 기록이 없어요."}));}return;
   }
   if(req.url!=="/state"){res.writeHead(404);res.end("{}");return;}
   if(req.method==="POST") {
    let body="";for await(const chunk of req){body+=chunk;if(body.length>1024){res.writeHead(413);res.end("{}");return;}}
    const action=JSON.parse(body).action;
    if(!["start","pause","flatten"].includes(action)){res.writeHead(400);res.end("{}");return;}
    const version=++commandVersion;
    if(action!=="start")engine.state.running=false;
    if(action==="start") {
     await serial(async()=>{if(engine?.state.lifecycle?.status==="completed"&&engine.state.live.date!==koreaClock().date)await configure();});
     await refresh();
    }
    await serial(async()=>{if(action==="start"&&version!==commandVersion)throw new Error("더 최근 운용 명령이 있어 시작을 취소했어요.");await engine!.command(action);await report();});
   }else if(req.method!=="GET"){res.writeHead(405);res.end("{}");return;}
   res.end(JSON.stringify(engine.state));
  }catch(e){res.writeHead(409);res.end(JSON.stringify({error:e instanceof Error&&/계좌|운용|세션|거래일|잔액|후보|명령|대사|보유|미체결/.test(e.message)?e.message:"계좌 엔진 처리 중 오류가 발생했어요."}));}
 });
 // Acquire the OS singleton before opening/truncating/writing any order journal.
 await new Promise<void>((resolve,reject)=>{server.once("error",reject);server.listen(4318,"127.0.0.1",resolve);});
 try {await serial(configure);}catch{console.error("계좌 연결을 기다리고 있어요. /program-trading에서 설정해 주세요.");}
 initialized=true;
 console.log("KIS program worker http://127.0.0.1:4318/state · actual broker orders enabled");
 void refresh().catch(()=>{});
 const candidateTimer=setInterval(()=>{void refresh().catch(()=>{});},60000);
 let ticking=false;
 const timer=setInterval(()=>{if(ticking||!engine)return;ticking=true;void serial(async()=>{await engine!.tick();await report();}).finally(()=>{ticking=false;}).catch(()=>{});},5000);
 for(const sig of ["SIGINT","SIGTERM"] as const)process.on(sig,()=>{clearInterval(timer);clearInterval(candidateTimer);void serial(async()=>{if(engine)await engine.command("pause");server.close(()=>process.exit(0));});});
}
void (process.env.PROGRAM_TRADING_MODE==="replay"?replayMain():liveMain()).catch(error=>{console.error(error);process.exit(1);});
