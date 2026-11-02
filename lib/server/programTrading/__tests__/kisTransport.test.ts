import { describe, expect, it, vi } from "vitest";
import type { AxiosInstance } from "axios";
import { KisTransport } from "../kisTransport";
const credentials={accountNumber:"12345678",accountProductCode:"01",environment:"prod" as const,appKey:"test",appSecret:"secret"};
function setup(){const post=vi.fn().mockResolvedValue({status:200,data:{access_token:"secret-token",expires_in:86400}});const request=vi.fn();const transport=new KisTransport(credentials,{post,request} as unknown as AxiosInstance,0);return {transport,request,post};}
describe("KIS transport",()=>{
 it("never retries an ambiguous mutation, and redacts transport details",async()=>{
  const {transport,request}=setup();request.mockRejectedValue(new Error("secret-token"));
  await expect(transport.request("/order","TR",{},true)).rejects.toMatchObject({outcome:"unknown"});expect(request).toHaveBeenCalledTimes(1);
 });
 it("walks all pages with continuation headers",async()=>{
  const {transport,request}=setup();request.mockResolvedValueOnce({status:200,data:{rt_cd:"0",output1:[{id:1}],ctx_area_fk100:"a",ctx_area_nk100:"b"},headers:{tr_cont:"M"}}).mockResolvedValueOnce({status:200,data:{rt_cd:"0",output1:[{id:2}]},headers:{tr_cont:"D"}});
  expect(await transport.pages("/history","TR",{})).toMatchObject({complete:true,rows:[{id:1},{id:2}]});
  expect(request.mock.calls[1][0]).toMatchObject({headers:{tr_cont:"N"},params:{CTX_AREA_FK100:"a",CTX_AREA_NK100:"b"}});
 });
 it("fails closed on an endless cursor rather than declaring a partial history complete",async()=>{
  const {transport,request}=setup();request.mockResolvedValue({status:200,data:{rt_cd:"0",output1:[],ctx_area_fk100:"a",ctx_area_nk100:"b"},headers:{tr_cont:"M"}});
  await expect(transport.pages("/history","TR",{})).rejects.toThrow(/연속조회/);
 });
 it("distinguishes an explicit rejection from a server failure",async()=>{
  const {transport,request}=setup();request.mockResolvedValueOnce({status:200,data:{rt_cd:"1",msg1:"secret"},headers:{}}).mockResolvedValueOnce({status:503,data:{},headers:{}});
  await expect(transport.request("/order","TR",{},true)).rejects.toMatchObject({outcome:"rejected"});
  await expect(transport.request("/order","TR",{},true)).rejects.toMatchObject({outcome:"unknown"});
 });
});
