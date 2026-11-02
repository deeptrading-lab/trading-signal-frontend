import { beforeEach, describe, expect, it, vi } from "vitest";
import { createKisBroker, mapBrokerOrder } from "../kisBroker";
import { BrokerRequestError, type KisTransport, type KisResponse } from "../kisTransport";
vi.mock("../liveQuotes", async original => ({ ...await original<object>(), koreaClock:()=>({date:"20261102",time:"093000",minute:570,second:0}) }));
const credentials={accountNumber:"12345678",accountProductCode:"01",environment:"prod" as const,appKey:"test-key",appSecret:"test-secret"};
const daily={odno:"0001",pdno:"005930",ord_qty:"10",tot_ccld_qty:"4",tot_ccld_amt:"400000",rmn_qty:"6",rjct_qty:"0",cnc_cfrm_qty:"0",cncl_yn:"N",sll_buy_dvsn_cd:"02",ord_gno_brno:"001",ord_dt:"20261102",ord_tmd:"093000"};
const intent={clientId:"local-1",ticker:"005930",side:"buy" as const,quantity:2,price:100000,reason:"breakout" as const};
beforeEach(()=>{vi.unstubAllEnvs();});
function setup(environment:"prod"|"vts"="prod") {
 const request=vi.fn(async(path:string):Promise<KisResponse>=>{
  if(path.includes("chk-holiday"))return {data:{output:[{bass_dt:"20261102",opnd_yn:"Y"}]},headers:{}};
  if(path.includes("inquire-psbl-order"))return {data:{output:{nrcvb_buy_qty:"10"}},headers:{}};
  return {data:{output:{ODNO:"1001",KRX_FWDG_ORD_ORGNO:"001"}},headers:{}};
 });
 const pages=vi.fn().mockResolvedValue({rows:[],last:{output2:[{tot_evlu_amt:"1000000",dnca_tot_amt:"1000000",thdt_tlex_amt:"0"}]},complete:true});
 const transport={request,pages} as unknown as KisTransport;
 return {broker:createKisBroker({...credentials,environment},{transport,market:transport}),request,pages};
}
describe("KIS broker contract without network",()=>{
 it("preserves non-stock and fractional holdings so startup cannot mistake the account for empty",async()=>{
  const {broker,pages}=setup();pages.mockResolvedValue({rows:[{pdno:"FUND-CODE",hldg_qty:"1.5",pchs_avg_pric:"10",prpr:"10"}],last:{output2:[{tot_evlu_amt:"1000000",dnca_tot_amt:"1000000",thdt_tlex_amt:"0"}]},complete:true});
  expect((await broker.account()).holdings).toHaveLength(1);
  pages.mockResolvedValue({rows:[{pdno:"005930",hldg_qty:"-1",pchs_avg_pric:"10",prpr:"10"}],last:{output2:[{tot_evlu_amt:"1000000",dnca_tot_amt:"1000000",thdt_tlex_amt:"0"}]},complete:true});
  await expect(broker.account()).rejects.toThrow(/잔고/);
 });

 it("maps cumulative partial fills and final cancellation separately",()=>{
  expect(mapBrokerOrder(daily)).toMatchObject({status:"partial",filledQuantity:4,filledAmount:400000});
  expect(mapBrokerOrder({...daily,rmn_qty:"0",cnc_cfrm_qty:"6",cncl_yn:"Y"})).toMatchObject({status:"cancelled",filledQuantity:4});
  expect(()=>mapBrokerOrder({...daily,rmn_qty:undefined})).toThrow();
 });
 it("uses a cash-only quantity check and actual limit order TR",async()=>{
  const {broker,request}=setup();await broker.submit(intent);
  expect(request).toHaveBeenCalledWith(expect.stringContaining("order-cash"),"TTTC0012U",expect.objectContaining({ORD_DVSN:"00",ORD_UNPR:"100000",ORD_QTY:"2",EXCG_ID_DVSN_CD:"KRX"}),true);
 });
 it("rejects market buys and exceeding the notional cap before dispatch",async()=>{
  const {broker,request}=setup();
  await expect(broker.submit({...intent,price:0})).rejects.toMatchObject({outcome:"rejected"});
  await expect(broker.submit({...intent,quantity:11})).rejects.toThrow(/한도/);
  expect(request).not.toHaveBeenCalled();
 });
 it("does not submit beyond the no-margin cash-only buy quantity",async()=>{
  const {broker,request}=setup();request.mockImplementation(async path=>path.includes("chk-holiday")?{data:{output:[{bass_dt:"20261102",opnd_yn:"Y"}]},headers:{}}:{data:{output:{nrcvb_buy_qty:"0"}},headers:{}});
  await expect(broker.submit(intent)).rejects.toThrow(/현금/);
  expect(request.mock.calls.some(([path])=>path.endsWith("order-cash"))).toBe(false);
 });
 it("treats success without an order number as unknown",async()=>{
  const {broker,request}=setup();request.mockImplementation(async path=>path.includes("chk-holiday")?{data:{output:[{bass_dt:"20261102",opnd_yn:"Y"}]},headers:{}}:path.includes("inquire-psbl-order")?{data:{output:{nrcvb_buy_qty:"10"}},headers:{}}:{data:{output:{}},headers:{}});
  await expect(broker.submit(intent)).rejects.toBeInstanceOf(BrokerRequestError);
  await expect(broker.submit(intent)).rejects.toMatchObject({outcome:"unknown"});
 });
 it("uses VTS buy/sell transaction IDs independently of production market data",async()=>{
  const {broker,request}=setup("vts");await broker.submit(intent);await broker.submit({...intent,side:"sell",price:0});
  expect(request).toHaveBeenCalledWith(expect.stringContaining("order-cash"),"VTTC0012U",expect.any(Object),true);
  expect(request).toHaveBeenCalledWith(expect.stringContaining("order-cash"),"VTTC0011U",expect.objectContaining({ORD_DVSN:"01"}),true);
 });
 it("checks the fresh cancellable quantity before cancellation",async()=>{
  const {broker,pages,request}=setup();pages.mockResolvedValue({rows:[{odno:"0001",psbl_qty:"3",krx_fwdg_ord_orgno:"001"}],complete:true,last:{}});
  await broker.cancel(mapBrokerOrder(daily));
  expect(request).toHaveBeenCalledWith(expect.stringContaining("order-rvsecncl"),"TTTC0013U",expect.objectContaining({ORGN_ODNO:"0001",ORD_QTY:"3",QTY_ALL_ORD_YN:"Y"}),true);
 });
 it("keeps dry-run from sending a real order or producing fake fills",async()=>{
  vi.stubEnv("KIS_DRY_RUN","1");const {broker,request}=setup();await expect(broker.submit(intent)).rejects.toMatchObject({outcome:"rejected"});expect(request).not.toHaveBeenCalled();
 });
});
