import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLiveEngine } from "../liveEngine";
import type { BrokerAccount, BrokerOrder, LiveBroker, LivePersist, OrderIntent } from "../liveTypes";
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date("2026-11-02T01:00:00Z"));});
afterEach(()=>vi.useRealTimers());
const quote={ticker:"005930",name:"삼성전자",price:10100,previousHigh:10000,volumeRatio:2,spreadBps:8,ageMs:0,halted:false};
function fixture() {
 const account:BrokerAccount={totalFees:0,equity:10_000_000,cash:10_000_000,availableCash:10_000_000,holdings:[],complete:true,checkedAt:new Date().toISOString()};
 const orders:BrokerOrder[]=[];
 const broker:LiveBroker={mode:"vts",accountKey:"hash",accountMasked:"****1234",maxOrderKrw:500_000,account:vi.fn(async()=>structuredClone(account)),orders:vi.fn(async()=>({rows:structuredClone(orders),complete:true})),submit:vi.fn(async(intent:OrderIntent)=>{
  const id=String(orders.length+1);orders.push({...intent,id,organization:"branch",filledQuantity:0,filledAmount:0,averagePrice:0,status:"open",date:"20261102",time:"100000"});return{id,organization:"branch"};
 }),cancel:vi.fn(async()=>{}),quotes:vi.fn(async()=>[quote]),session:vi.fn(async()=>({date:"20261102",minute:600,open:true,tradingDay:true}))};
 const persist=vi.fn<LivePersist>(async()=>{});const engine=createLiveEngine(broker,persist);
 const now=Date.now();engine.state.candidates={status:"ready",rows:[{...quote,sources:["volume"]}],checkedAt:new Date(now).toISOString(),expiresAt:new Date(now+120000).toISOString()};
 return {account,orders,broker,persist,engine};
}
async function started() {const f=fixture();await f.engine.command("start");await f.engine.tick();return f;}
function fill(f:Awaited<ReturnType<typeof started>>,quantity:number,price=10100) {
 f.orders[0]={...f.orders[0],filledQuantity:quantity,filledAmount:quantity*price,averagePrice:price,status:quantity===f.orders[0].quantity?"filled":"partial"};
 f.account.cash=10_000_000-quantity*price;f.account.availableCash=f.account.cash;
 f.account.holdings=quantity?[{ticker:quote.ticker,quantity,averagePrice:price,mark:price}]:[];
}
describe("live broker order lifecycle",()=>{
 it("persists intent before submit, caps limit-order notional and never books acceptance as a fill",async()=>{
  const f=await started();const order=f.engine.state.live.orders[0];
  expect(order.price).toBe(quote.price);expect(order.quantity*order.price).toBeLessThanOrEqual(f.broker.maxOrderKrw);
  expect(f.engine.state.trades).toEqual([]);expect(f.engine.state.positions).toEqual([]);
  const intentCall=f.persist.mock.calls.findIndex(call=>(call[1] as {kind:string}).kind==="order-intent");
  expect(f.persist.mock.invocationCallOrder[intentCall]).toBeLessThan((f.broker.submit as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]);
 });
 it("applies cumulative partial fills once and cancels before selling the final filled quantity",async()=>{
  const f=await started();fill(f,5);await f.engine.tick();await f.engine.tick();
  expect(f.engine.state.trades).toHaveLength(1);expect(f.engine.state.positions[0].quantity).toBe(5);
  await f.engine.command("flatten");await f.engine.tick();expect(f.broker.cancel).toHaveBeenCalledTimes(1);
  expect(f.broker.submit).toHaveBeenCalledTimes(1);
  fill(f,7);await f.engine.tick();expect(f.broker.cancel).toHaveBeenCalledTimes(1);expect(f.broker.submit).toHaveBeenCalledTimes(1);
  f.orders[0].status="cancelled";await f.engine.tick();expect(f.broker.submit).toHaveBeenCalledTimes(2);
  expect(f.engine.state.live.orders[1]).toMatchObject({side:"sell",quantity:7});expect(f.engine.state.lifecycle?.status).toBe("stopping");
  f.orders[1]={...f.orders[1],filledQuantity:7,filledAmount:70700,averagePrice:10100,status:"filled"};
  f.account.holdings=[];f.account.cash=10_000_000;await f.engine.tick();
  expect(f.engine.state.lifecycle?.status).toBe("completed");expect(f.engine.state.lifecycle?.afterBalance).toBe(f.account.equity);
 });
 it("keeps unknown orders locked without inferring identity or retrying a submit",async()=>{
  const f=fixture();f.broker.submit=vi.fn(async()=>{throw Error("timeout");});
  await f.engine.command("start");await f.engine.tick();await f.engine.tick();await f.engine.command("flatten");await f.engine.tick();
  expect(f.broker.submit).toHaveBeenCalledTimes(1);expect(f.engine.state.live.orders[0].status).toBe("unknown");
  expect(f.engine.state.live.recoveryRequired).toBe(true);expect(f.engine.state.lifecycle?.status).toBe("stopping");
 });
 it("does not submit if durable intention write fails",async()=>{
  const f=fixture();await f.engine.command("start");f.persist.mockImplementation(async(_state,event)=>{if((event as {kind:string}).kind==="order-intent")throw Error("disk full");});
  await f.engine.tick();expect(f.broker.submit).not.toHaveBeenCalled();expect(f.engine.state.live.recoveryRequired).toBe(true);
 });
 it("refuses existing holdings and pending orders at start",async()=>{
  const f=fixture();f.account.holdings=[{ticker:quote.ticker,quantity:1,averagePrice:100,mark:100}];await expect(f.engine.command("start")).rejects.toThrow(/기존 보유/);
  f.account.holdings=[];f.orders.push({id:"external",organization:"",ticker:quote.ticker,side:"buy",quantity:1,filledQuantity:0,filledAmount:0,averagePrice:0,status:"open",date:"20261102",time:"100000"});await expect(f.engine.command("start")).rejects.toThrow(/미체결/);
 });
 it("does not sell external holdings or finalize incomplete account reconciliation",async()=>{
  const f=await started();f.account.holdings=[{ticker:"000660",quantity:1,averagePrice:100,mark:100}];await f.engine.command("flatten");await f.engine.tick();
  expect(f.broker.submit).toHaveBeenCalledTimes(1);expect(f.engine.state.live.recoveryRequired).toBe(true);
  f.account.complete=false;await f.engine.tick();expect(f.engine.state.lifecycle?.status).toBe("stopping");expect(f.engine.state.live.balanceFresh).toBe(false);
 });
 it("recovers an unacknowledged intent paused and never submits it again",async()=>{
  const f=await started();const state=structuredClone(f.engine.state);state.live.orders[0].id=null;state.live.orders[0].status="intent";
  const recovered=createLiveEngine(f.broker,f.persist,state);await recovered.recover();await recovered.tick();
  expect(recovered.state.running).toBe(false);expect(recovered.state.live.recoveryRequired).toBe(true);expect(f.broker.submit).toHaveBeenCalledTimes(1);
 });
 it("blocks holiday entries and detects unexplained final equity changes",async()=>{
  const f=fixture();f.broker.session=vi.fn(async()=>({date:"20261102",minute:600,open:false,tradingDay:false}));await expect(f.engine.command("start")).rejects.toThrow(/거래일/);
  const g=fixture();await g.engine.command("start");await g.engine.command("flatten");g.account.equity+=10000;await g.engine.tick();
  expect(g.engine.state.live.depositWithdrawalDetected).toBe(true);expect(g.engine.state.lifecycle?.status).toBe("stopping");
 });
});

it("latches durable-store failure even after a later successful reconciliation",async()=>{
 const f=fixture();await f.engine.command("start");let failed=false;
 f.persist.mockImplementation(async(_state,event)=>{if(!failed&&event?.kind==="order-intent"){failed=true;throw Error("disk");}});
 await f.engine.tick();await f.engine.tick();
 expect(f.broker.submit).not.toHaveBeenCalled();expect(f.engine.state.live.recoveryRequired).toBe(true);
 await expect(f.engine.command("start")).rejects.toThrow(/원장 저장/);
});
it("records definite rejection without converting it to unknown or retrying automatically",async()=>{
 const f=fixture();f.broker.submit=vi.fn(async()=>{throw Object.assign(Error("rejected"),{outcome:"rejected"});});
 await f.engine.command("start");await f.engine.tick();await f.engine.tick();
 expect(f.engine.state.live.orders[0].status).toBe("rejected");expect(f.broker.submit).toHaveBeenCalledTimes(1);expect(f.engine.state.running).toBe(false);
});
it("ignores elapsed stale quotes and rotates only one candidate after held tickers",async()=>{
 const f=fixture();const now=Date.now();
 f.engine.state.candidates.rows.push({...quote,ticker:"000660",sources:["volume"]});
 f.broker.quotes=vi.fn(async()=>[{...quote,ageMs:1000,receivedAt:now-5000}]);
 await f.engine.command("start");await f.engine.tick();await f.engine.tick();
 expect(f.broker.submit).not.toHaveBeenCalled();
 expect(f.broker.quotes).toHaveBeenNthCalledWith(1,["005930"]);expect(f.broker.quotes).toHaveBeenNthCalledWith(2,["000660"]);
});
it("uses actual daily costs and detects even small unexplained deposits",async()=>{
 const f=fixture();await f.engine.command("start");await f.engine.command("flatten");f.account.totalFees=25;f.account.equity-=25;await f.engine.tick();
 expect(f.engine.state.lifecycle?.status).toBe("completed");expect(f.engine.state.lifecycle?.returnPct).toBeLessThan(0);
 const g=fixture();await g.engine.command("start");await g.engine.command("flatten");g.account.equity+=2;await g.engine.tick();expect(g.engine.state.live.depositWithdrawalDetected).toBe(true);
});

it("honors a stop received while the buy intention is being synced",async()=>{
 const f=fixture();await f.engine.command("start");
 f.persist.mockImplementation(async(state,event)=>{if(event?.kind==="order-intent")state.running=false;});
 await f.engine.tick();expect(f.broker.submit).not.toHaveBeenCalled();expect(f.engine.state.live.orders[0].status).toBe("rejected");
});

it("keeps acknowledged orders missing from a complete broker snapshot locked",async()=>{
 const f=await started();f.orders.length=0;
 await f.engine.tick();await f.engine.tick();
 expect(f.engine.state.live.orders[0].status).toBe("unknown");expect(f.engine.state.live.recoveryRequired).toBe(true);expect(f.engine.state.running).toBe(false);
 expect(f.broker.submit).toHaveBeenCalledTimes(1);await expect(f.engine.command("start")).rejects.toThrow(/대사/);
});
it("locks unexplained cumulative amount changes without fabricating a fill",async()=>{
 const f=await started();fill(f,5);await f.engine.tick();const prior=structuredClone(f.engine.state.trades);
 f.orders[0].filledAmount+=1;await f.engine.tick();
 expect(f.engine.state.live.recoveryRequired).toBe(true);expect(f.engine.state.trades).toEqual(prior);expect(f.broker.submit).toHaveBeenCalledTimes(1);
});

it("preflights idle holiday state and caches the check for thirty seconds",async()=>{
 const f=fixture();f.broker.session=vi.fn(async()=>({date:"20261102",minute:600,open:false,tradingDay:false}));
 await f.engine.readiness(true);expect(f.engine.state.live.startBlockReason).toMatch(/휴장일/);
 await f.engine.tick();expect(f.broker.session).toHaveBeenCalledTimes(1);expect(f.broker.submit).not.toHaveBeenCalled();
 vi.advanceTimersByTime(30001);await f.engine.tick();expect(f.broker.session).toHaveBeenCalledTimes(2);
});
it("preflights existing holdings and clears the reason when the idle account is ready",async()=>{
 const f=fixture();f.account.holdings=[{ticker:quote.ticker,quantity:1,averagePrice:100,mark:100}];
 await f.engine.readiness(true);expect(f.engine.state.live.startBlockReason).toMatch(/기존 보유/);expect(f.broker.submit).not.toHaveBeenCalled();
 f.account.holdings=[];await f.engine.readiness(true);expect(f.engine.state.live.startBlockReason).toBeUndefined();
 await f.engine.command("start");const checked=f.engine.state.live.marketCheckedAt;await f.engine.readiness(true);expect(f.engine.state.live.marketCheckedAt).toBe(checked);
});
