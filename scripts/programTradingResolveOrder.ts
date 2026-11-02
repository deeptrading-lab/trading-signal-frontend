import { createServer } from "node:net";
import { getProgramCredentials } from "../lib/server/programTrading/account";
import { createKisBroker } from "../lib/server/programTrading/kisBroker";
import { createLiveStore } from "../lib/server/programTrading/liveStore";
import { koreaClock } from "../lib/server/programTrading/liveQuotes";

// Operator-selected broker identity only. This tool neither sends nor cancels any order.
async function main() {
 const args=Object.fromEntries(process.argv.slice(2).map(arg=>arg.replace(/^--/,"").split("=")));
 if(!args["client-id"]||!/^\d+$/.test(args["broker-order-id"]??"")||!/^\d{8}$/.test(args.date??"")||args["confirm-broker-order"]!=="yes")throw new Error("워커를 종료한 후 --client-id=… --broker-order-id=… --date=YYYYMMDD --confirm-broker-order=yes를 지정해 주세요.");
 // The same OS lock as the worker prevents concurrent journal writers.
 const lock=createServer(socket=>socket.destroy());
 await new Promise<void>((resolve,reject)=>{lock.once("error",reject);lock.listen(4318,"127.0.0.1",resolve);});
 try {
  const broker=createKisBroker(await getProgramCredentials());
  const store=await createLiveStore(`.local/program-trading/live/${broker.accountKey}`);
  const state=await store.load();if(!state||state.live.accountKey!==broker.accountKey)throw new Error("대사할 계좌 원장이 없어요.");
  const order=state.live.orders.find(order=>order.clientId===args["client-id"]);
  if(!order||order.id||!["unknown","intent"].includes(order.status))throw new Error("주문번호가 없는 미확정 의도만 연결할 수 있어요.");
  if(koreaClock(new Date(order.createdAt)).date!==args.date)throw new Error("의도 생성일과 증권사 주문 일자가 일치하지 않아요.");
  const snapshot=await broker.orders(args.date);
  const row=snapshot.rows.find(row=>row.id===args["broker-order-id"]&&row.date===args.date);
  if(!snapshot.complete||!row||row.ticker!==order.ticker||row.side!==order.side||row.quantity!==order.quantity)throw new Error("선택한 증권사 주문과 의도의 종목·방향·수량이 일치하지 않아요.");
  if(state.live.orders.some(other=>other!==order&&other.id===row.id&&koreaClock(new Date(other.createdAt)).date===args.date)||state.live.baselineOrderIds.includes(row.id))throw new Error("이미 다른 거래에 연결된 주문번호예요.");
  order.id=row.id;order.organization=row.organization;order.updatedAt=new Date().toISOString();
  state.running=false;state.live.recoveryRequired=true;state.lastError="운용자가 주문번호를 연결했어요. 워커 재시작 후 잔고 대사가 필요해요.";
  await store.commit(state,"operator-order-associated",{clientId:order.clientId,brokerOrderId:row.id,date:args.date,confirmed:true});
  console.log("주문번호 연결을 기록했어요. 워커를 재시작하면 체결·잔고를 다시 대사하며, 신규 매수는 자동 재개하지 않아요.");
 } finally { await new Promise<void>(resolve=>lock.close(()=>resolve())); }
}
void main().catch(error=>{console.error(error instanceof Error&&"code" in error&&error.code==="EADDRINUSE"?"워커를 먼저 종료해 주세요.":error instanceof Error?error.message:"주문번호 대사에 실패했어요.");process.exitCode=1;});
