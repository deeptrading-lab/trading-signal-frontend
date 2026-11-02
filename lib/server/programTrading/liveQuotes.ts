import type { Quote } from "@/lib/types/programTrading/programTrading";
import { KisTransport, listField, numberField, objectField, type KisRecord } from "./kisTransport";
export function koreaClock(now=new Date()) {
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(now);
 const part=(name:string)=>parts.find(p=>p.type===name)?.value??"";
 return { date:`${part("year")}${part("month")}${part("day")}`, time:`${part("hour")}${part("minute")}${part("second")}`, minute:Number(part("hour"))*60+Number(part("minute")), second:Number(part("second")) };
}
export function quoteFromKis(ticker:string,current:KisRecord,book:KisRecord,bars:KisRecord[],now=new Date()):Quote {
 const clock=koreaClock(now);const thisMinute=clock.time.slice(0,4);
 const validBars=bars.filter(row=>row.stck_bsop_date===clock.date && typeof row.stck_cntg_hour==="string" && /^\d{6}$/.test(row.stck_cntg_hour));
 const unique=new Map(validBars.map(row=>[String(row.stck_cntg_hour).slice(0,4),row]));
 const previous=[...unique.entries()].filter(([minute])=>minute<thisMinute).sort(([a],[b])=>b.localeCompare(a)).slice(0,3);
 const complete=previous.length===3;
 // Exactly the immediately preceding minutes: missing bars are not silently skipped.
 const toMinute=(value:string)=>Number(value.slice(0,2))*60+Number(value.slice(2,4));
 const continuous=complete && !previous.some(([key],index)=>toMinute(key)!==clock.minute-index-1);
 const active=unique.get(thisMinute);
 const previousHigh=continuous?Math.max(...previous.map(([,bar])=>numberField(bar.stck_hgpr))):0;
 const avgVolume=previous.reduce((sum,[,bar])=>sum+numberField(bar.cntg_vol),0)/3;
 const volumeRatio=continuous && active && avgVolume>0 ? numberField(active.cntg_vol)/avgVolume : 0;
 const tradeTime=current.lastTradeTime;
 if(typeof tradeTime!=="string" || !/^\d{6}$/.test(tradeTime)) throw new Error("최근 실제 체결시각을 확인하지 못했어요.");
 const price=numberField(current.stck_prpr);const ask=numberField(book.askp1);const bid=numberField(book.bidp1);
 const stamp=book.aspr_acpt_hour;
 if(typeof stamp!=="string" || !/^\d{6}$/.test(stamp) || ask<bid || bid<=0 || price<=0) throw new Error("호가나 시세를 확인하지 못했어요.");
 const seconds=clock.minute*60+clock.second;
 const bookAge=(seconds-(toMinute(stamp)*60+Number(stamp.slice(4))))*1000;
 const tradeAge=(seconds-(toMinute(tradeTime)*60+Number(tradeTime.slice(4))))*1000;
 const ageMs=bookAge<0||tradeAge<0?-1:Math.max(bookAge,tradeAge);
 const halted=current.temp_stop_yn!=="N" || book.new_mkop_cls_code!=="20";
 return {ticker,name:typeof current.hts_kor_isnm==="string"?current.hts_kor_isnm:ticker,price,previousHigh,volumeRatio,spreadBps:(ask-bid)/((ask+bid)/2)*10000,ageMs,halted,receivedAt:now.getTime()};
}
export function createQuoteLoader(transport:KisTransport) {
 return async(tickers:string[]):Promise<Quote[]>=>{
  const result:Quote[]=[];
  for(const ticker of [...new Set(tickers)]) {
   if(!/^\d{6}$/.test(ticker)) continue;
   try {
    const params={FID_COND_MRKT_DIV_CODE:"J",FID_INPUT_ISCD:ticker};
    // Fetch bars first, book last so the freshness age includes all preceding network time.
    const bars=await transport.request("/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice","FHKST03010200",{...params,FID_INPUT_HOUR_1:koreaClock().time,FID_PW_DATA_INCU_YN:"N",FID_ETC_CLS_CODE:""});
    const current=await transport.request("/uapi/domestic-stock/v1/quotations/inquire-price","FHKST01010100",params);
    const trades=await transport.request("/uapi/domestic-stock/v1/quotations/inquire-time-itemconclusion","FHPST01060000",{...params,FID_INPUT_HOUR_1:koreaClock().time});
    const latest=listField(trades.data.output2)[0];
    if(!latest) continue;
    const book=await transport.request("/uapi/domestic-stock/v1/quotations/inquire-asking-price-exp-ccn","FHKST01010200",params);
    const quote=quoteFromKis(ticker,{...objectField(current.data.output),stck_prpr:latest.stck_prpr??latest.stck_pbpr,lastTradeTime:latest.stck_cntg_hour},objectField(book.data.output1),listField(bars.data.output2));
    // More than one ticker may be fetched; do not retain age calculated before later calls.
    result.push(quote);
   } catch { /* A missing/invalid quote is unavailable, never a mock fallback. */ }
  }
  return result.map(q=>({...q,ageMs:q.ageMs+Date.now()-(q.receivedAt??Date.now()),receivedAt:Date.now()}));
 };
}
