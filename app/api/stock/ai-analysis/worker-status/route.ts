/**
 * 로컬 분석 워커 온라인/오프라인 상태 — prod 가 "지금 요청하면 처리되나" 안내에 사용. (PRD §3-2)
 *
 * KV 하트비트(`analysis:worker:heartbeat`)를 읽어 판정한다. 키 신선(TTL 내)=온라인, 만료/부재=오프라인.
 * 읽기만 하므로 Vercel 가드 불요(prod·로컬 공통 동작).
 */

import { NextResponse } from "next/server";
import { readHeartbeat } from "@/lib/server/ai/workerHeartbeat";

export async function GET(): Promise<Response> {
  const hb = await readHeartbeat();
  if (!hb) {
    return NextResponse.json({ online: false });
  }
  return NextResponse.json({
    online: true,
    status: hb.status,
    queueDepth: hb.queueDepth,
  });
}
