import axios, { type AxiosInstance } from "axios";
import { createHash } from "node:crypto";
import { resolveKisBaseUrl } from "@/lib/api/kis/client";
import type { AccountInput } from "@/lib/types/programTrading/programTrading";
export type ProgramCredentials = Required<AccountInput>;
export type KisRecord = Record<string, unknown>;
export type KisResponse = { data: KisRecord; headers: Record<string, unknown> };
export class BrokerRequestError extends Error {
 constructor(public readonly outcome: "rejected" | "unknown", message: string) { super(message); }
}
export function numberField(value: unknown): number {
 if ((typeof value !== "string" && typeof value !== "number") || String(value).trim() === "" || !Number.isFinite(Number(value))) throw new Error("한투 응답의 숫자 필드가 유효하지 않아요.");
 return Number(value);
}
export function listField(value: unknown): KisRecord[] {
 if (!Array.isArray(value) || value.some(v => !v || typeof v !== "object")) throw new Error("한투 응답 목록이 유효하지 않아요.");
 return value as KisRecord[];
}
export function objectField(value: unknown): KisRecord {
 if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("한투 응답을 확인할 수 없어요.");
 return value as KisRecord;
}
export class KisTransport {
 private token: {value: string; until: number} | null = null;
 private tail: Promise<unknown> = Promise.resolve();
 private lastRequest = 0;
 private client: AxiosInstance;
 constructor(readonly credentials: ProgramCredentials, client?: AxiosInstance, private interval = credentials.environment === "vts" ? 550 : 150) {
  this.client = client ?? axios.create({baseURL:resolveKisBaseUrl(credentials.environment),timeout:5000,proxy:false,validateStatus:()=>true});
 }
 private serial<T>(fn:()=>Promise<T>):Promise<T> {
  const task=this.tail.then(fn);this.tail=task.catch(()=>undefined);return task;
 }
 private async pace() { const wait=this.interval-(Date.now()-this.lastRequest);if(wait>0) await new Promise(resolve=>setTimeout(resolve,wait));this.lastRequest=Date.now(); }
 async request(path: string, trId: string, payload: Record<string,string>, post=false, continuation=""):Promise<KisResponse> {
  return this.serial(async()=>{
   const c=this.credentials;
   if (!c.appKey || !c.appSecret) throw new BrokerRequestError("rejected","한투 API 키를 연결해 주세요.");
   if (!this.token || this.token.until<=Date.now()) {
    await this.pace();
    let response;
    try { response=await this.client.post("/oauth2/tokenP",{grant_type:"client_credentials",appkey:c.appKey,appsecret:c.appSecret}); }
    catch { throw new BrokerRequestError("rejected","한투 인증 서버에 연결하지 못했어요."); }
    if (response.status!==200 || typeof response.data?.access_token!=="string") throw new BrokerRequestError("rejected","한투 인증에 실패했어요.");
    const ttl=numberField(response.data.expires_in);
    this.token={value:response.data.access_token,until:Date.now()+Math.max(0,ttl-60)*1000};
   }
   const headers: Record<string,string>={authorization:`Bearer ${this.token.value}`,appkey:c.appKey,appsecret:c.appSecret,tr_id:trId,custtype:"P"};
   if(continuation) headers.tr_cont=continuation;
   await this.pace();
   let response;
   try { response=await this.client.request({url:path,method:post?"POST":"GET",headers,...(post?{data:payload}:{params:payload})}); }
   catch { throw new BrokerRequestError(post?"unknown":"rejected",post?"주문 응답이 불명확해요. 주문내역 대사 전 재전송하지 않아요.":"한투 조회에 실패했어요."); }
   if(response.status>=500) throw new BrokerRequestError(post?"unknown":"rejected","한투 서버 응답을 확인하지 못했어요.");
   const data=objectField(response.data);
   if (response.status!==200 || data.rt_cd!=="0") throw new BrokerRequestError("rejected","한투가 요청을 거절했어요. 계좌와 주문 가능 상태를 확인해 주세요.");
   return {data,headers:response.headers as Record<string,unknown>};
  });
 }
 async pages(path:string,trId:string,params:Record<string,string>,field="output1") {
  const rows:KisRecord[]=[];const seen=new Set<string>();let cursor="";let last:KisRecord={};
  for(let page=0;page<50;page++) {
   const response=await this.request(path,trId,params,false,cursor?"N":"");last=response.data;
   rows.push(...listField(last[field]));
   const continuation=String(response.headers.tr_cont??"");
   if(!["M","F"].includes(continuation)) return {rows,last,complete:true};
   const fk=String(last.ctx_area_fk100??"");const nk=String(last.ctx_area_nk100??"");
   const key=`${fk}:${nk}`;
   if(!nk || seen.has(key)) throw new Error("한투 연속조회가 완결되지 않아 운용을 중지해요.");
   seen.add(key);cursor=key;params={...params,CTX_AREA_FK100:fk,CTX_AREA_NK100:nk};
  }
  throw new Error("한투 조회 한도를 초과해 전체 대사를 완료하지 못했어요.");
 }
}

const shared = new Map<string, KisTransport>();
export function getSharedTransport(credentials: ProgramCredentials) {
 const key=createHash("sha256").update(JSON.stringify(credentials)).digest("hex");
 let transport=shared.get(key);
 if(!transport) { transport=new KisTransport(credentials);shared.set(key,transport); }
 return transport;
}
