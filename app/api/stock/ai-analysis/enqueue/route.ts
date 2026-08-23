/**
 * prod 분석 요청 enqueue — prod 배포 주소에서 "AI 종합분석 요청"을 큐(ai_analysis_queue)에 적재한다. (PRD §3-1)
 *
 * ⚠️ **Vercel 가드 없음**(의도적): Supabase INSERT 만 하므로 prod 에서 동작해야 한다(AC-1).
 *   실제 분석 실행(`../route.ts`)은 여전히 로컬 전용(503 가드 유지) — 여기선 요청만 받는다.
 *
 * 흐름: ticker 살균 → enqueueAnalysis(중복 가드 내장: 같은 ticker pending/processing 이면 적재 안 함) →
 *   워커 온라인 여부(workerOffline) 동봉. 오프라인이어도 적재는 정상(큐 내구성, UI 경고용 — AC-5).
 */

import { NextRequest, NextResponse } from "next/server";
import { enqueueAnalysis } from "@/lib/server/ai/queueStore";
import { requireProdSessionApi, sessionEmail } from "@/lib/server/auth/apiGuard";
import { readHeartbeat } from "@/lib/server/ai/workerHeartbeat";
import { getSymbolName } from "@/lib/api/kis";
import { pickStockName } from "@/lib/utils/resolveStockName";

export async function POST(req: NextRequest): Promise<Response> {
  // 미로그인은 분석 실행 불가(analyze-owner-cards) — prod 한정. 로컬 dev·워커는 통과.
  // prod 의 유일한 실행 경로가 이 enqueue 다(직접 실행 라우트는 Vercel 에서 이미 503).
  const denied = await requireProdSessionApi(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as {
    ticker?: unknown;
    force?: unknown;
    name?: unknown;
  } | null;

  if (!body || typeof body.ticker !== "string") {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }

  // route.ts 와 동일한 ticker 살균(영숫자·_- 만 허용).
  const ticker = body.ticker.trim().replace(/[^A-Za-z0-9_-]/g, "");
  if (!ticker) {
    return NextResponse.json({ error: "ticker가 필요합니다." }, { status: 400 });
  }

  const force = body.force === true;
  // 종목명(decision-stock-name) — 대기중(pending) 카드도 즉시 종목명 표시용. 클라 전달명 → 시드 폴백 순.
  //   클라(AI 패널)는 BFF 경유로 이미 보강된 종목명을 보내지만, 없을 때 서버 시드(getSymbolName)로 보강.
  const name = pickStockName(ticker, [
    typeof body.name === "string" ? body.name : undefined,
    getSymbolName(ticker),
  ]);
  // 요청 계정 귀속(analyze-owner-filter) — 완료 결과 카드가 이 값으로 필터된다. 미로그인이면 null.
  const requestedBy = await sessionEmail(req);
  const result = await enqueueAnalysis({ ticker, force, name, requestedBy });

  if (result.status === "not_configured") {
    return NextResponse.json(
      { error: "분석 큐가 아직 설정되지 않았어요. 잠시 후 다시 시도해 주세요." },
      { status: 503 },
    );
  }
  if (result.status === "error") {
    return NextResponse.json(
      { error: "요청을 접수하지 못했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }

  // queued | already — 워커 온라인 여부를 함께 알려 UI 가 오프라인 경고(S5)를 띄울 수 있게 한다.
  const hb = await readHeartbeat();
  return NextResponse.json({
    status: result.status, // 'queued' | 'already'
    id: result.id,
    workerOffline: hb == null,
  });
}
