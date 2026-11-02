import { createHash } from "node:crypto";
import type { LiveBroker, BrokerOrder, OrderIntent, BrokerHolding } from "./liveTypes";
import { BrokerRequestError, KisTransport, getSharedTransport, numberField, objectField, listField, type KisRecord, type ProgramCredentials } from "./kisTransport";
import { createQuoteLoader, koreaClock } from "./liveQuotes";
import { mergeCandidates, unavailableCandidates } from "./candidates";
import type { CandidateSnapshot } from "@/lib/types/programTrading/programTrading";

export function mapBrokerOrder(row:KisRecord):BrokerOrder {
 const id=String(row.odno??"");const ticker=String(row.pdno??"");
 const quantity=numberField(row.ord_qty);const filledQuantity=numberField(row.tot_ccld_qty);
 const remaining=numberField(row.rmn_qty);const filledAmount=numberField(row.tot_ccld_amt);
 const rejected=numberField(row.rjct_qty);const cancelled=numberField(row.cnc_cfrm_qty);
 if(!/^\d+$/.test(id) || !/^\d{6}$/.test(ticker) || ![quantity,filledQuantity,remaining,rejected,cancelled].every(Number.isInteger) || quantity<0 || filledQuantity<0 || filledQuantity>quantity || remaining<0 || filledAmount<0 || !["01","02"].includes(String(row.sll_buy_dvsn_cd))) throw new Error("주문 내역의 형식이 유효하지 않아요.");
 let status:BrokerOrder["status"];
 if(filledQuantity===quantity && quantity>0) status="filled";
 else if(remaining===0 && (row.cncl_yn==="Y" || cancelled>0)) status="cancelled";
 else if(remaining===0 && rejected>0) status="rejected";
 else if(remaining>0) status=filledQuantity>0?"partial":"open";
 else throw new Error("주문 잔량 상태를 확정하지 못했어요.");
 return {id,organization:String(row.ord_gno_brno??row.ord_orgno??""),ticker,side:row.sll_buy_dvsn_cd==="02"?"buy":"sell",quantity,filledQuantity,filledAmount,averagePrice:filledQuantity?filledAmount/filledQuantity:0,status,date:String(row.ord_dt??""),time:String(row.ord_tmd??"")};
}
export function createKisBroker(credentials:ProgramCredentials, options:{transport?:KisTransport;market?:KisTransport;maxOrderKrw?:number}={}):LiveBroker {
 if(!/^\d{8}$/.test(credentials.accountNumber) || !/^\d{2}$/.test(credentials.accountProductCode) || !credentials.appKey || !credentials.appSecret) throw new Error("한투 계좌를 먼저 연결해 주세요.");
 const transport=options.transport??getSharedTransport(credentials);
 const marketCredentials=credentials.environment==="prod"?credentials:{...credentials,environment:"prod" as const,appKey:process.env.KIS_APP_KEY??"",appSecret:process.env.KIS_APP_SECRET??""};
 const market=options.market??(credentials.environment==="prod"?transport:getSharedTransport(marketCredentials));
 const base={CANO:credentials.accountNumber,ACNT_PRDT_CD:credentials.accountProductCode};
 const tr=(prod:string,vts=prod.replace(/^T/,"V"))=>credentials.environment==="prod"?prod:vts;
 const maxOrderKrw=options.maxOrderKrw??Number(process.env.KIS_ORDER_MAX_KRW??1_000_000);
 if(!Number.isFinite(maxOrderKrw) || maxOrderKrw<=0) throw new Error("주문 금액 한도를 확인해 주세요.");
 let holiday:{date:string;open:boolean}|null=null;
 const broker:LiveBroker={
  mode:credentials.environment,
  accountKey:createHash("sha256").update(`${credentials.environment}:${credentials.accountNumber}:${credentials.accountProductCode}`).digest("hex").slice(0,24),
  accountMasked:`****${credentials.accountNumber.slice(-4)}-${credentials.accountProductCode}`,
  maxOrderKrw,
  async account() {
   const snapshot=await transport.pages("/uapi/domestic-stock/v1/trading/inquire-balance",tr("TTTC8434R"),{...base,AFHR_FLPR_YN:"N",OFL_YN:"",INQR_DVSN:"01",UNPR_DVSN:"01",FUND_STTL_ICLD_YN:"N",FNCG_AMT_AUTO_RDPT_YN:"N",PRCS_DVSN:"00",CTX_AREA_FK100:"",CTX_AREA_NK100:""});
   const summary=objectField(listField(snapshot.last.output2)[0]);
   const holdings:BrokerHolding[]=snapshot.rows.map(row=>({ticker:String(row.pdno??""),quantity:numberField(row.hldg_qty),averagePrice:numberField(row.pchs_avg_pric),mark:numberField(row.prpr)}));
   if(holdings.some(p=>!p.ticker || p.ticker.length>32 || p.quantity<0 || p.averagePrice<0 || p.mark<0)) throw new Error("계좌 잔고 대사를 완료하지 못했어요.");
   const equity=numberField(summary.tot_evlu_amt);const cash=numberField(summary.dnca_tot_amt);const totalFees=numberField(summary.thdt_tlex_amt);
   if(equity<0 || cash<0 || totalFees<0) throw new Error("계좌 자산을 확인해 주세요.");
   return {totalFees,equity,cash,availableCash:cash,holdings:holdings.filter(p=>p.quantity>0),complete:snapshot.complete,checkedAt:new Date().toISOString()};
  },
  async orders(date) {
   if(!/^\d{8}$/.test(date)) throw new Error("조회 일자를 확인해 주세요.");
   const result=await transport.pages("/uapi/domestic-stock/v1/trading/inquire-daily-ccld",tr("TTTC0081R"),{...base,INQR_STRT_DT:date,INQR_END_DT:date,SLL_BUY_DVSN_CD:"00",INQR_DVSN:"01",PDNO:"",CCLD_DVSN:"00",ORD_GNO_BRNO:"",ODNO:"",INQR_DVSN_3:"00",INQR_DVSN_1:"",CTX_AREA_FK100:"",CTX_AREA_NK100:"",EXCG_ID_DVSN_CD:"KRX"});
   const rows=result.rows.map(mapBrokerOrder);
   if(rows.some(row=>row.date!==date)) throw new Error("주문 조회 날짜가 일치하지 않아요.");
   const ids=new Set(rows.map(row=>row.id));if(ids.size!==rows.length) throw new Error("중복 주문 내역이 있어 대사를 중지해요.");
   return {rows,complete:result.complete};
  },
  async submit(intent:OrderIntent) {
   if(process.env.KIS_DRY_RUN==="1") throw new BrokerRequestError("rejected","현재 주문 차단 모드예요. KIS_DRY_RUN 설정을 확인해 주세요.");
   if(!/^\d{6}$/.test(intent.ticker) || !["buy","sell"].includes(intent.side) || !Number.isSafeInteger(intent.quantity) || intent.quantity<1 || !Number.isSafeInteger(intent.price) || intent.price<0) throw new BrokerRequestError("rejected","주문 입력을 확인해 주세요.");
   // Cash-only limit buys make the notional cap enforceable before dispatch.
   if(intent.side==="buy" && (intent.price===0 || intent.price*intent.quantity>maxOrderKrw)) throw new BrokerRequestError("rejected","매수 지정가 주문 금액 한도를 초과했어요.");
   const session=await broker.session();
   if(!session.open || (intent.side==="buy" && (session.minute<550 || session.minute>=900))) throw new BrokerRequestError("rejected","현재 주문 가능한 시간이 아니에요.");
   if(intent.side==="buy") {
    const possibility=await transport.request("/uapi/domestic-stock/v1/trading/inquire-psbl-order",tr("TTTC8908R"),{...base,PDNO:intent.ticker,ORD_UNPR:String(intent.price),ORD_DVSN:"00",CMA_EVLU_AMT_ICLD_YN:"N",OVRS_ICLD_YN:"N"});
    const cashOnly=numberField(objectField(possibility.data.output).nrcvb_buy_qty);
    if(intent.quantity>cashOnly) throw new BrokerRequestError("rejected","미수 없는 현금 매수 가능 수량을 초과했어요.");
   }
   const response=await transport.request("/uapi/domestic-stock/v1/trading/order-cash",tr(intent.side==="buy"?"TTTC0012U":"TTTC0011U"),{...base,PDNO:intent.ticker,ORD_DVSN:intent.price>0?"00":"01",ORD_QTY:String(intent.quantity),ORD_UNPR:String(intent.price),EXCG_ID_DVSN_CD:"KRX",SLL_TYPE:intent.side==="sell"?"01":"",CNDT_PRIC:""},true);
   const out=objectField(response.data.output);const id=String(out.ODNO??out.odno??"");const organization=String(out.KRX_FWDG_ORD_ORGNO??out.krx_fwdg_ord_orgno??"");
   if(!/^\d+$/.test(id) || !organization) throw new BrokerRequestError("unknown","주문 번호를 확인하지 못해 재전송을 차단했어요.");
   return {id,organization};
  },
  async cancel(order) {
   // KIS requires a fresh cancellable quantity query before the cancellation.
   let possible:number;let organization=order.organization;
   if(credentials.environment==="prod") {
    const snapshot=await transport.pages("/uapi/domestic-stock/v1/trading/inquire-psbl-rvsecncl","TTTC0084R",{...base,INQR_DVSN_1:"0",INQR_DVSN_2:"0",CTX_AREA_FK100:"",CTX_AREA_NK100:""},"output");
    const row=snapshot.rows.find(row=>String(row.odno)===order.id);
    if(!row) return;possible=numberField(row.psbl_qty);organization=String(row.krx_fwdg_ord_orgno??row.ord_gno_brno??organization);
   } else {
    // The cancellable-order query is production-only. VTS uses a fresh complete daily-order snapshot.
    const fresh=await broker.orders(order.date);const row=fresh.rows.find(row=>row.id===order.id);
    if(!row || !["open","partial"].includes(row.status)) return;possible=row.quantity-row.filledQuantity;
   }
   if(possible<=0) return;
   if(!organization) throw new BrokerRequestError("rejected","취소할 원주문 조직번호를 확인하지 못했어요.");
   await transport.request("/uapi/domestic-stock/v1/trading/order-rvsecncl",tr("TTTC0013U"),{...base,KRX_FWDG_ORD_ORGNO:organization,ORGN_ODNO:order.id,ORD_DVSN:"00",RVSE_CNCL_DVSN_CD:"02",ORD_QTY:String(possible),ORD_UNPR:"0",QTY_ALL_ORD_YN:"Y",EXCG_ID_DVSN_CD:"KRX"},true);
  },
  quotes:createQuoteLoader(market),
  async session() {
   const clock=koreaClock();
   if(holiday?.date!==clock.date) {
    const response=await market.request("/uapi/domestic-stock/v1/quotations/chk-holiday","CTCA0903R",{BASS_DT:clock.date,CTX_AREA_FK:"",CTX_AREA_NK:""});
    const row=listField(response.data.output).find(row=>row.bass_dt===clock.date);
    if(!row || !["Y","N"].includes(String(row.opnd_yn))) throw new Error("한국 거래일을 확인하지 못해 주문하지 않아요.");
    holiday={date:clock.date,open:row.opnd_yn==="Y"};
   }
   return {date:clock.date,minute:clock.minute,tradingDay:holiday.open,open:holiday.open && clock.minute>=540 && clock.minute<930};
  },
 };
 return broker;
}
export async function loadKisCandidates(credentials:ProgramCredentials):Promise<CandidateSnapshot> {
 try {
  // Ranking APIs require a production market-data key even for a VTS trading account.
  const marketCredentials=credentials.environment==="prod"?credentials:{...credentials,environment:"prod" as const,appKey:process.env.KIS_APP_KEY??"",appSecret:process.env.KIS_APP_SECRET??""};
  const market=getSharedTransport(marketCredentials);
  const volume=await market.request("/uapi/domestic-stock/v1/quotations/volume-rank","FHPST01710000",{FID_COND_MRKT_DIV_CODE:"J",FID_COND_SCR_DIV_CODE:"20171",FID_INPUT_ISCD:"0000",FID_DIV_CLS_CODE:"1",FID_BLNG_CLS_CODE:"0",FID_TRGT_CLS_CODE:"111111111",FID_TRGT_EXLS_CLS_CODE:"0000000000",FID_INPUT_PRICE_1:"",FID_INPUT_PRICE_2:"",FID_VOL_CNT:"",FID_INPUT_DATE_1:""});
  const flow=async(subject:string)=>(await market.request("/uapi/domestic-stock/v1/quotations/foreign-institution-total","FHPTJ04400000",{FID_COND_MRKT_DIV_CODE:"V",FID_COND_SCR_DIV_CODE:"16449",FID_INPUT_ISCD:"0000",FID_DIV_CLS_CODE:"1",FID_RANK_SORT_CLS_CODE:"0",FID_ETC_CLS_CODE:subject})).data.output;
  const row=(value:unknown)=>listField(value).map(item=>({ticker:String(item.mksc_shrn_iscd??""),name:String(item.hts_kor_isnm??""),price:numberField(item.stck_prpr)}));
  const foreign=await flow("1");const institution=await flow("2");
  const rows=mergeCandidates(row(volume.data.output),row(foreign),row(institution));const now=Date.now();
  return {status:rows.length?"ready":"empty",rows,checkedAt:new Date(now).toISOString(),expiresAt:new Date(now+120000).toISOString()};
 } catch { return unavailableCandidates(); }
}
