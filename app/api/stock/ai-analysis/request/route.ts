/**
 * `/api/stock/ai-analysis/request` — 봇용 "지금 시작 가능?" 판정 + (대기 시) 큐 적재. (unified-analysis-jobs 후속)
 *
 * 봇은 분석 전에 이 엔드포인트를 먼저 호출한다:
 *  - 빈 슬롯이 있으면 `{ mode:'start-now' }` → 봇이 그 자리에서 기존처럼 네이티브 스트리밍 실행
 *    (POST `/api/stock/ai-analysis`). 그 사이 슬롯을 뺏겨 429 나면 봇이 다시 이 엔드포인트로 폴백.
 *  - 3슬롯이 꽉 찼으면 큐에 pending(source='bot')으로 적재하고
 *    `{ mode:'queued', position, etaMinutes }` → 봇이 "대기 N번째 · 약 M분 후" 안내. 워커가 드레인.
 *
 * 세마포어(concurrencyGate)는 next dev 단일 프로세스라 `currentCount` 가 전 소스(브라우저·봇·워커)
 * 합산 현재 실행 수. 읽기·적재만 하므로 Vercel 가드 불요(로컬 워커 전제라 사실상 로컬에서 호출).
 */

import { NextRequest, NextResponse } from "next/server";
import { currentCount, MAX_CONCURRENT } from "@/lib/server/ai/concurrencyGate";
import { enqueueAnalysis, getQueueDepth } from "@/lib/server/ai/queueStore";

/** 대기 순번당 예상 분석 소요(분). ETA = position × 이 값(러프 오버에스티메이트 — 봇이 ±범위로 표기). */
const MINUTES_PER_ANALYSIS = 10;

export async function POST(req: NextRequest): Promise<Response> {
  const body = (await req.json().catch(() => null)) as
    | { ticker?: unknown; name?: unknown }
    | null;
  if (!body || typeof body.ticker !== "string") {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }
  const ticker = body.ticker.trim().replace(/[^A-Za-z0-9_-]/g, "");
  if (!ticker) {
    return NextResponse.json({ error: "ticker가 필요합니다." }, { status: 400 });
  }
  const name =
    typeof body.name === "string" && body.name.trim() ? body.name.trim() : null;

  // 빈 슬롯 있으면 봇이 지금 바로 네이티브 실행. (currentCount = 전 소스 합산 현재 실행 수)
  const freeSlots = MAX_CONCURRENT - currentCount();
  if (freeSlots > 0) {
    return NextResponse.json({ mode: "start-now", freeSlots });
  }

  // 가득 참 → 큐에 pending(source='bot')으로 적재 + 대기 순번·ETA 안내. 워커가 슬롯 나면 드레인.
  const result = await enqueueAnalysis({ ticker, name, source: "bot" });
  const pending = await getQueueDepth(); // 현재 pending 수(방금 적재분 포함) ≈ 대기 순번
  const position = Math.max(1, pending);
  return NextResponse.json({
    mode: "queued",
    already: result.status === "already",
    position,
    etaMinutes: position * MINUTES_PER_ANALYSIS,
  });
}
