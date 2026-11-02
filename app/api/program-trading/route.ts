import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { allowsLocalProgram } from "@/lib/server/programTrading/localRequest";
export const runtime="nodejs";
export const dynamic="force-dynamic";
async function proxy(request: NextRequest) {
  if(!allowsLocalProgram(request, request.method === "POST")) return NextResponse.json({error:"로컬 개발 환경에서만 사용할 수 있어요."},{status:403});
  try {
    let data;
    if(request.method==="POST") {
      if(request.headers.get("origin")!==`${request.nextUrl.protocol}//${request.headers.get("host")}`) return NextResponse.json({error:"요청 출처를 확인해 주세요."},{status:403});
      data=await request.json();
      if(!data || !["start","pause","flatten"].includes(data.action)) return NextResponse.json({error:"지원하지 않는 명령이에요."},{status:400});
    }
    const response=await axios({url:"http://127.0.0.1:4318/state",method:request.method,data,timeout:25000,proxy:false,validateStatus:()=>true});
    return NextResponse.json(response.data,{status:response.status,headers:{"Cache-Control":"no-store"}});
  } catch { return NextResponse.json({error:"로컬 엔진에 연결할 수 없어요. npm run program:worker 실행 상태를 확인해 주세요."},{status:503}); }
}
export const GET=proxy;
export const POST=proxy;
