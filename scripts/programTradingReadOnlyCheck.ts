import { getProgramCredentials } from "../lib/server/programTrading/account";
import { createKisBroker } from "../lib/server/programTrading/kisBroker";
import { koreaClock } from "../lib/server/programTrading/liveQuotes";
// This diagnostic intentionally exposes no mutation method and prints no financial values/identifiers.
async function main() {
 const broker=createKisBroker(await getProgramCredentials());
 let stage="account";
 try {
  const account=await broker.account();stage="orders";
  const orders=await broker.orders(koreaClock().date);stage="session";
  const session=await broker.session();
  console.log(JSON.stringify({readOnlyProbe:true,accountComplete:account.complete,balanceNumeric:Number.isFinite(account.equity),feesNumeric:Number.isFinite(account.totalFees),holdingsCount:account.holdings.length,ordersComplete:orders.complete,ordersCount:orders.rows.length,tradingDay:session.tradingDay,marketOpen:session.open}));
 } catch(error) {
  console.error(`조회 전용 연결 검증 실패 (${stage}): ${error instanceof Error ? error.message : "연결 또는 응답 확인 필요"}`);process.exitCode=1;
 }
}
void main().catch(()=>{console.error("한투 계좌 설정을 확인해 주세요.");process.exitCode=1;});
