import { randomUUID } from "node:crypto";
import { initialState, RULES } from "./engine";
import { hasCandidates } from "@/lib/validation/programTrading/candidateGate";
import type { Command, Quote, Reason } from "@/lib/types/programTrading/programTrading";
import type { BrokerAccount, BrokerOrder, LiveBroker, LiveOrder, LivePersist, LiveState } from "./liveTypes";

const orderDate = (order: LiveOrder) => new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(order.createdAt)).replaceAll("-","");
const terminal = (status: LiveOrder["status"]) => ["filled", "cancelled", "rejected"].includes(status);
const valid = (q: Quote | undefined): q is Quote => !!q && !q.halted && q.ageMs >= 0 && q.ageMs + (q.receivedAt ? Math.max(0,Date.now()-q.receivedAt) : 0) <= 5000 && Number.isFinite(q.price) && q.price > 0;
export function initialLiveState(broker: LiveBroker): LiveState {
 return { ...initialState(), executionMode: broker.mode, cash: 0, initial: 0, equity: 0,
  live: { accountKey: broker.accountKey, accountMasked: broker.accountMasked, date: "", orders: [], lastReconciledAt: null, balanceFresh: false, depositWithdrawalDetected: false, maxOrderKrw: broker.maxOrderKrw, baselineOrderIds: [], recoveryRequired: false } };
}
export function createLiveEngine(broker: LiveBroker, persist: LivePersist, restored?: LiveState) {
 const state = restored ?? initialLiveState(broker);
 if (state.live.accountKey !== broker.accountKey || state.executionMode !== broker.mode) throw new Error("계좌별 원장이 일치하지 않아요.");
 let storageFailed=false;
 const now = () => new Date().toISOString();
 const activeOrders = () => state.live.orders.filter(order => !terminal(order.status));
 async function save(kind: string, detail: Record<string, unknown> = {}) {
  state.updatedAt=now();
  try { await persist(state, {kind,...detail}); }
  catch(error) { storageFailed=true;lock("원장 저장 실패 · 프로세스 재시작 및 대사 전 추가 주문을 잠갔어요.");throw error; }
 }
 function lock(message: string) { state.running=false;state.live.recoveryRequired=true;state.lastError=message; }
 function applyFill(order: LiveOrder, row: BrokerOrder) {
  if (row.filledQuantity < order.filledQuantity || row.filledAmount < order.filledAmount || row.filledQuantity > order.quantity) throw new Error("주문 누적 체결값이 일치하지 않아요.");
  const delta = row.filledQuantity-order.filledQuantity;
  const amount = row.filledAmount-order.filledAmount;
  if(delta===0 && amount!==0) throw new Error("체결수량 변경 없이 누적금액이 변경되어 대사가 필요해요.");
  if (delta > 0) {
   if (!(amount>0) || !Number.isFinite(amount)) throw new Error("체결 금액을 확인할 수 없어요.");
   const price = amount/delta;
   let p=state.positions.find(p=>p.ticker===order.ticker);
   let net: number|null=null;
   if(order.side==="buy") {
    if(p) { p.entry=(p.entry*p.quantity+amount)/(p.quantity+delta);p.quantity+=delta;p.mark=price; }
    else { p={ticker:order.ticker,quantity:delta,entry:price,mark:price};state.positions.push(p); }
   } else {
    if (!p || p.quantity < delta) throw new Error("세션 보유수량을 초과한 매도체결이에요.");
    net=amount-p.entry*delta;state.realized+=net;p.quantity-=delta;
    if(!p.quantity) { state.positions=state.positions.filter(item=>item!==p);state.cooldown[order.ticker]=Date.now()+RULES.cooldown*60_000; }
   }
   state.trades.push({id:`${order.clientId}:${row.filledQuantity}`,minute:state.minute,ticker:order.ticker,side:order.side,quantity:delta,price,fee:0,feeEstimated:true,reason:order.reason,net:null});
  }
  order.filledQuantity=row.filledQuantity;order.filledAmount=row.filledAmount;order.status=order.status==="cancelling"&&!terminal(row.status)?"cancelling":row.status;order.updatedAt=now();
 }
 async function reconcile(currentDate=state.live.date): Promise<{account:BrokerAccount;rows:BrokerOrder[]}> {
  state.live.balanceFresh=false;
  const [account, first, today] = await Promise.all([broker.account(), broker.orders(state.live.date), currentDate===state.live.date?Promise.resolve(null):broker.orders(currentDate)]);
  const list={complete:first.complete&&(today?.complete??true),rows:[...first.rows,...(today?.rows??[])]};
  if(!account.complete || !list.complete) throw new Error("계좌·당일 주문의 전체 페이지를 조회하지 못했어요.");
  if (![account.equity,account.cash,account.availableCash].every(Number.isFinite)) throw new Error("계좌 잔액을 확인할 수 없어요.");
  // KIS does not echo clientId. Ticker/quantity coincidences cannot prove ownership.
  // A timed-out intent remains locked until an operator reconciles its broker identity.
  for(const order of state.live.orders) {
   if(!order.id && ["intent","unknown"].includes(order.status)) {
    order.status="unknown"; lock("주문 결과 확인 필요 · 주문번호 대사 전 추가 주문을 잠갔어요.");
   }
   if(order.id) {
    const row=list.rows.find(row=>row.id===order.id&&row.date===orderDate(order));
    if(!row) { order.status="unknown";lock("접수된 주문이 당일 조회에 없어 대사가 필요해요.");continue; }
    if(row.ticker!==order.ticker || row.side!==order.side || row.quantity!==order.quantity) throw new Error("주문 식별값이 일치하지 않아요.");
    applyFill(order,row);
   }
  }
  const external=list.rows.filter(row=>!(row.date===state.live.date&&state.live.baselineOrderIds.includes(row.id))&&!state.live.orders.some(order=>order.id===row.id&&row.date===orderDate(order)));
  if(external.length) lock("자동매매 외 주문이 감지되어 대사가 필요해요.");
  const holdings = account.holdings.filter(p=>p.quantity>0);
  const quantitiesMatch=holdings.length===state.positions.length && holdings.every(h=>state.positions.some(p=>p.ticker===h.ticker&&p.quantity===h.quantity));
  if(!quantitiesMatch) lock("세션 보유와 실제 잔고가 일치하지 않아요.");
  for(const p of state.positions) { const holding=holdings.find(h=>h.ticker===p.ticker);if(holding&&holding.mark>0)p.mark=holding.mark; }
  state.cash=account.cash;state.equity=account.equity;
  if(Number.isFinite(account.totalFees))state.live.feeDays={...state.live.feeDays,[currentDate]:account.totalFees!};
  state.live.balanceFresh=true;state.live.lastReconciledAt=account.checkedAt;
  const unresolved=activeOrders().some(o=>["unknown","intent"].includes(o.status));
  if(!storageFailed && !unresolved && !external.length && quantitiesMatch && !state.live.depositWithdrawalDetected) { state.live.recoveryRequired=false;state.lastError=null; }
  await save("reconcile");
  return {account,rows:list.rows};
 }
 async function submit(ticker:string,side:"buy"|"sell",quantity:number,reason:Reason,price=0) {
  if((side==="buy"&&!state.running) || storageFailed || state.live.recoveryRequired || state.lastError || activeOrders().some(o=>o.ticker===ticker)) return;
  const order:LiveOrder={clientId:randomUUID(),ticker,side,quantity,price,reason,id:null,organization:"",status:"intent",filledQuantity:0,filledAmount:0,createdAt:now(),updatedAt:now()};
  state.live.orders.push(order);
  await save("order-intent",{order}); // Mandatory fsync before any broker mutation.
  if(side==="buy"&&!state.running) {order.status="rejected";await save("order-aborted-before-dispatch",{clientId:order.clientId});return;}
  try {
   const result=await broker.submit(order);
   if(!result.id) throw new Error("주문번호 없음");
   order.id=result.id;order.organization=result.organization;order.status="open";order.updatedAt=now();
   await save("order-accepted",{order});
  } catch(error) {
   if(error && typeof error==="object" && "outcome" in error && error.outcome==="rejected") { order.status="rejected";order.updatedAt=now();state.cooldown[ticker]=Date.now()+RULES.cooldown*60_000;state.running=false;await save("order-rejected",{clientId:order.clientId});return; }
   order.status="unknown";lock("주문 응답을 확인하지 못했어요. 대사 전 다시 주문하지 않아요.");await save("order-unknown",{clientId:order.clientId});
  }
 }
 async function cancelBuys(rows:BrokerOrder[]) {
  for(const order of activeOrders().filter(o=>o.side==="buy" && o.id && o.status!=="cancelling")) {
   const row=rows.find(row=>row.id===order.id&&row.date===orderDate(order));
   if(!row || terminal(row.status)) continue;
   order.status="cancelling";await save("cancel-intent",{id:order.id});
   try { await broker.cancel(row);await save("cancel-requested",{id:order.id}); }
   catch { lock("취소 결과를 확인하지 못했어요. 주문 대사가 필요해요.");await save("cancel-unknown",{id:order.id}); }
  }
 }
 function checkCompletion(account:BrokerAccount) {
  if(storageFailed||state.lifecycle?.status!=="stopping"||activeOrders().length||state.positions.length||account.holdings.some(h=>h.quantity>0)||state.live.recoveryRequired) return;
  const grossNet=state.live.orders.reduce((sum,o)=>sum+(o.side==="sell"?o.filledAmount:-o.filledAmount),0);
  const fees=Object.values(state.live.feeDays??{}).reduce((sum,value)=>sum+value,0)-(state.live.baselineFees??0);
  const difference=account.equity-state.lifecycle.beforeBalance-grossNet+fees;
  if(!Number.isFinite(account.totalFees)||state.live.baselineFees===undefined) {lock("실제 거래 비용을 확인하지 못해 수익률 확정을 보류해요.");return;}
  if(Math.abs(difference)>1) { state.live.depositWithdrawalDetected=true;lock("입출금 또는 비용 불일치가 있어 수익률 확정을 보류해요.");return; }
  const pct=(account.equity/state.lifecycle.beforeBalance-1)*100;
  state.lifecycle={...state.lifecycle,status:"completed",finishedAt:now(),afterBalance:account.equity,returnPct:pct,reviewDecision:pct>=state.lifecycle.targetReturnPct?"keep":"review"};
 }
 async function recover() {
  state.running=false;
  if(state.lifecycle?.status==="completed") {await save("recovered-completed");return;}
  for(const order of activeOrders()) if(order.status==="intent")order.status="unknown";
  if(state.live.date) {
   try {
    const session=await broker.session();
    if(session.date!==state.live.date && state.lifecycle)state.lifecycle.status="stopping";
    await reconcile(session.date);
   } catch { lock("재시작 계좌·주문 대사를 완료하지 못했어요.");await save("recovery-blocked"); }
  }
  await save("recovered-paused");
 }
 async function readiness(force=false) {
  if(state.lifecycle)return;
  const checked=state.live.marketCheckedAt?Date.parse(state.live.marketCheckedAt):0;
  if(!force&&Date.now()-checked<30_000)return;
  let reason:string|undefined;
  try {
   const session=await broker.session();
   const [account,list]=await Promise.all([broker.account(),broker.orders(session.date)]);
   if(!account.complete||!list.complete)reason="계좌와 미체결 전체 조회를 완료하지 못했어요.";
   else if(!session.tradingDay)reason="오늘은 한국 주식시장 휴장일이에요.";
   else if(!session.open||session.minute<550||session.minute>=900)reason="거래일 09:10~15:00 사이에 시작할 수 있어요.";
   else if(account.holdings.some(holding=>holding.quantity>0))reason="기존 보유 종목이 없는 계좌에서 시작해 주세요.";
   else if(list.rows.some(order=>!terminal(order.status)))reason="기존 미체결 주문을 정리한 후 시작해 주세요.";
   else if(!Number.isFinite(account.totalFees))reason="계좌의 실제 거래 비용 조회가 필요해요.";
   else if(!(account.equity>0)||!(account.availableCash>0))reason="주문 가능한 잔액이 없어요.";
  }catch{reason="계좌·거래일 조회를 완료하지 못했어요. 연결 상태를 확인해 주세요.";}
  state.live.marketCheckedAt=now();
  if(reason)state.live.startBlockReason=reason;else delete state.live.startBlockReason;
  await save("readiness",{reason:reason??null});
 }
 async function command(action:Command) {
  if(action==="pause") { state.running=false;await save("paused");return; }
  if(action==="flatten") {
   if(state.lifecycle?.status==="completed") return;
   state.running=false;
   if(state.lifecycle)state.lifecycle.status="stopping";
   await save("stop-requested");return;
  }
  if(storageFailed)throw new Error("원장 저장 오류 이후에는 워커 재시작과 대사가 필요해요.");
  if(state.lifecycle?.status==="completed" || state.lifecycle?.status==="stopping") throw new Error("종료한 세션 또는 종료 중인 세션은 시작할 수 없어요.");
  const session=await broker.session();state.minute=session.minute;
  if(!session.tradingDay || !session.open || session.minute<550 || session.minute>=900) throw new Error("거래일 09:10~15:00 사이에 시작할 수 있어요.");
  if(!hasCandidates(state.candidates)) throw new Error("유효한 매수 후보가 없어요.");
  if(!state.lifecycle) {
   const [account,list]=await Promise.all([broker.account(),broker.orders(session.date)]);
   if(!account.complete||!list.complete)throw new Error("계좌와 미체결 전체 조회가 필요해요.");
   if(account.holdings.some(h=>h.quantity>0)||list.rows.some(o=>!terminal(o.status)))throw new Error("기존 보유와 미체결이 없는 계좌에서 시작해 주세요.");
   if(!Number.isFinite(account.totalFees))throw new Error("계좌의 실제 거래 비용 조회가 필요해요.");
   if(!(account.equity>0)||!(account.availableCash>0))throw new Error("주문 가능한 잔액이 없어요.");
   state.live.date=session.date;state.live.baselineFees=account.totalFees;state.live.feeDays=account.totalFees===undefined?{}:{[session.date]:account.totalFees};state.live.baselineOrderIds=list.rows.map(o=>o.id);
   state.cash=account.cash;state.initial=account.equity;state.equity=account.equity;
   state.lifecycle={status:"running",startedAt:now(),finishedAt:null,beforeBalance:account.equity,afterBalance:null,returnPct:null,targetReturnPct:RULES.sessionTarget*100,reviewDecision:"pending"};
  } else {
   if(session.date!==state.live.date)throw new Error("이전 거래일 세션은 대사·종료 후 새 원장이 필요해요.");
   await reconcile();
  }
  if(state.live.recoveryRequired||state.killed)throw new Error("대사 또는 손실 제한 잠금으로 시작할 수 없어요.");
  delete state.live.startBlockReason;state.lifecycle.status="running";state.running=true;await save("session-started");
 }
 async function tick() {
  if(!state.lifecycle) {await readiness();return;}
  if(state.lifecycle.status==="completed")return;
  let session;
  try {
   session=await broker.session();state.minute=session.minute;state.tick++;
   if(session.date!==state.live.date) { state.running=false;state.lifecycle.status="stopping"; }
   const {account,rows}=await reconcile(session.date);
   if(session.minute>=920) { state.running=false;state.lifecycle.status="stopping"; }
   if(!session.tradingDay||!session.open) { state.running=false;checkCompletion(account);await save("market-closed");return; }
   if(state.equity<=state.initial*(1-RULES.dailyLoss)) { state.killed=true;state.running=false;if(state.lifecycle)state.lifecycle.status="stopping"; }
   if(session.minute>=920) { state.running=false;state.lifecycle.status="stopping"; }
   if(!hasCandidates(state.candidates))state.running=false;
   if(state.live.recoveryRequired)return;
   if(!state.running || state.lifecycle.status==="stopping")await cancelBuys(rows);
   if(state.live.recoveryRequired)return;
   const candidate = state.candidates.rows[(state.tick-1) % Math.max(1,state.candidates.rows.length)];
   const tickers=[...new Set([...state.positions.map(p=>p.ticker),...(state.running&&candidate?[candidate.ticker]:[])])];
   const expiredBuys=rows.filter(row=>state.live.orders.some(order=>order.id===row.id&&order.side==="buy"&&(!state.candidates.rows.some(c=>c.ticker===order.ticker)||Date.now()-Date.parse(order.createdAt)>=30_000)));
   await cancelBuys(expiredBuys);
   if(state.live.recoveryRequired)return;
   state.quotes=await broker.quotes(tickers);
   for(const p of [...state.positions]) {
    const q=state.quotes.find(q=>q.ticker===p.ticker);if(!valid(q))continue;p.mark=q.price;
    const change=q.price/p.entry-1;
    const reason:Reason|null=state.lifecycle.status==="stopping" ? state.killed?"kill":session.minute>=920?"close":"manual" : change<=-RULES.stop?"stop":change>=RULES.target?"target":null;
    if(reason) {
     if(activeOrders().some(o=>o.ticker===p.ticker&&o.side==="buy"))await cancelBuys(rows.filter(r=>r.ticker===p.ticker));
     await submit(p.ticker,"sell",p.quantity,reason);
    }
   }
   if(state.running && session.minute>=550 && session.minute<900 && !state.live.recoveryRequired && hasCandidates(state.candidates)) {
    let reserved=activeOrders().filter(o=>o.side==="buy").reduce((n,o)=>n+(o.quantity-o.filledQuantity)*(state.quotes.find(q=>q.ticker===o.ticker)?.price??Infinity),0);
    for(const candidate of state.candidates.rows) {
     const q=state.quotes.find(q=>q.ticker===candidate.ticker);
     if(state.positions.length+activeOrders().filter(o=>o.side==="buy"&&!state.positions.some(p=>p.ticker===o.ticker)).length>=RULES.maxPositions)break;
     if(!valid(q)||state.positions.some(p=>p.ticker===q.ticker)||activeOrders().some(o=>o.ticker===q.ticker)||(state.cooldown[q.ticker]??0)>Date.now())continue;
     if(![q.previousHigh,q.volumeRatio,q.spreadBps].every(Number.isFinite)||q.previousHigh<=0||q.spreadBps<0||q.spreadBps>15||q.volumeRatio<1.5||q.price<=q.previousHigh*1.001)continue;
     const unit=q.price*(1+RULES.slippage+RULES.fee);
     const budget=Math.min(state.equity*RULES.allocation,broker.maxOrderKrw,account.availableCash-reserved);
     const qty=Math.floor(Math.min(budget/unit,state.equity*RULES.risk/(unit*(RULES.stop+RULES.fee*2+RULES.sellTax+RULES.slippage))));
     if(qty<1)continue;
     await submit(q.ticker,"buy",qty,"breakout",q.price);reserved+=qty*unit;
     if(state.live.recoveryRequired)break;
    }
   }
   checkCompletion(account);await save("tick");
  } catch { lock("시세·주문·잔고 확인이 지연되어 신규 주문을 중지했어요.");await save("tick-failed"); }
 }
 return {state,recover,readiness,command,tick};
}
