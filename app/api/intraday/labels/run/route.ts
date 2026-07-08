/**
 * `POST /api/intraday/labels/run` — 완료 세션 틱 라벨링 수동 실행(백필). intraday-decision-overhaul PR-2.
 *
 * 완료된 cli-agent 세션 중 **미라벨 틱이 남은** 세션을 최근순으로 최대 N개(기본 3, 캡 10) 채점한다.
 * 기존 ~2,199틱 코퍼스를 관리자 버튼 반복 클릭으로 인터랙티브하게 백필하는 진입점 — 응답의
 * `remaining` 이 0 이 될 때까지 다시 누르면 된다(tick_id 멱등 upsert 라 중복 실행 무해).
 *
 * ⚠️ KIS 과거 분봉은 최근 며칠만 조회 가능 — 오래된 세션 틱은 UNRESOLVED 가 정상(기대 동작).
 * 게이트: prod 만 admin+(로컬 전체) — /intraday 페이지·paper-trading 라우트와 정합.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireProdAdminApi } from "@/lib/server/auth/apiGuard";
import {
  fetchLabeledTickIds,
  isTickLabelStoreConfigured,
  labelSessionTicks,
} from "@/lib/server/intraday/tickLabels";
import {
  getPaperTradingSessionDetail,
  listPaperTradingSessions,
} from "@/lib/server/paperTrading/sessionStore";
import type {
  RunIntradayTickLabelsRequest,
  RunIntradayTickLabelsResponse,
} from "@/lib/types/intraday/tickLabels";

const DEFAULT_SESSION_LIMIT = 3;
const MAX_SESSION_LIMIT = 10;

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function POST(request: NextRequest): Promise<Response> {
  const denied = await requireProdAdminApi(request);
  if (denied) return denied;

  const generatedAt = () => new Date().toISOString();
  if (!isTickLabelStoreConfigured()) {
    const payload: RunIntradayTickLabelsResponse = {
      configured: false,
      labeled: 0,
      unresolved: 0,
      sessions: 0,
      remaining: 0,
      generatedAt: generatedAt(),
    };
    return NextResponse.json(payload, { headers: NO_STORE });
  }

  // body 없는 POST 허용 — limit 만 optional 로 받는다(1~10 클램프).
  let limit = DEFAULT_SESSION_LIMIT;
  try {
    const body = (await request.json()) as RunIntradayTickLabelsRequest;
    if (typeof body.limit === "number" && Number.isFinite(body.limit)) {
      limit = Math.min(MAX_SESSION_LIMIT, Math.max(1, Math.floor(body.limit)));
    }
  } catch {
    /* 빈 body 는 기본값 */
  }

  try {
    const sessions = await listPaperTradingSessions();
    const completed = sessions.filter(
      (session) => session.decisionProvider === "cli-agent" && session.status === "completed",
    );
    const labeledIds = await fetchLabeledTickIds(completed.map((session) => session.id));

    let labeled = 0;
    let unresolved = 0;
    let processed = 0;
    let remaining = 0;
    for (const session of completed) {
      const detail = await getPaperTradingSessionDetail(session.id);
      const pending = (detail?.ticks ?? []).filter((tick) => !labeledIds.has(tick.id));
      if (pending.length === 0) continue; // 이미 전량 라벨된 세션은 건너뜀(멱등 백필).
      if (processed >= limit) {
        remaining += 1;
        continue;
      }
      const result = await labelSessionTicks(session, pending);
      if (result.skipped) {
        // KIS 미설정 등 전역 조건 — 더 돌아도 같은 결과라 남은 세션으로 계상하고 중단.
        remaining += 1;
        break;
      }
      labeled += result.labeled;
      unresolved += result.unresolved;
      processed += 1;
    }

    const payload: RunIntradayTickLabelsResponse = {
      configured: true,
      labeled,
      unresolved,
      sessions: processed,
      remaining,
      generatedAt: generatedAt(),
    };
    return NextResponse.json(payload, { headers: NO_STORE });
  } catch {
    return NextResponse.json(
      { error: "라벨링 실행에 실패했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500, headers: NO_STORE },
    );
  }
}
