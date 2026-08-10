/**
 * 과거 모의투자 내역 페이지 — Supabase 원장을 limit/offset 으로 직접 읽는다(intraday-history-pagination).
 *
 * "과거" 경계(오늘 00:00 KST 이전 시작)는 **서버가** 건다. 클라가 걸러내면 정렬 기준(updated_at)상
 * 오늘 세션이 1페이지를 거의 다 차지해 과거가 몇 건만 남는다.
 *
 * ⚠️ 이 라우트는 `sessionStore` 를 import 하지 않는다. 인메모리 스토어(`getStore().sessions`)는
 *    `tickScheduler.selectSchedulableSessions` 의 유일한 입력이라, 과거 세션이 거기 들어가는 순간
 *    자동 틱·마감 스윕·크로스데이 복구 대상이 된다. 히스토리는 읽기 전용 별도 경로로만 흐른다.
 *
 * 라우팅: 정적 세그먼트 `history` 가 형제 동적 세그먼트 `[sessionId]` 보다 먼저 매칭되고, 세션 id 는
 *        UUID 라 "history" 와 충돌하지 않는다.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireProdAdminApi } from "@/lib/server/auth/apiGuard";
import { kstDateStartIso, todayKstDate } from "@/lib/api/toss/kst";
import {
  PAPER_TRADING_HISTORY_MAX_OFFSET,
  PAPER_TRADING_HISTORY_MAX_PAGE_SIZE,
  PAPER_TRADING_HISTORY_PAGE_SIZE,
} from "@/lib/server/paperTrading/constants";
import { loadPersistedPaperTradingSessionSummaries } from "@/lib/server/paperTrading/persistence";
import type {
  PaperTradingPosition,
  PaperTradingSessionHistoryResponse,
} from "@/lib/types/paperTrading/paperTrading";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/** 쿼리 정수 파싱 + clamp — 선례 app/api/disclosure/list/route.ts:32-33. */
function clampInt(raw: string | null, min: number, max: number, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Math.trunc(Number(raw));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export async function GET(request: NextRequest): Promise<Response> {
  // prod 만 admin+(로컬 전체) — /intraday 페이지·세션 목록 라우트와 동일 게이트.
  const denied = await requireProdAdminApi(request);
  if (denied) return denied;

  const params = request.nextUrl.searchParams;
  const limit = clampInt(
    params.get("limit"),
    1,
    PAPER_TRADING_HISTORY_MAX_PAGE_SIZE,
    PAPER_TRADING_HISTORY_PAGE_SIZE,
  );
  const offset = clampInt(params.get("offset"), 0, PAPER_TRADING_HISTORY_MAX_OFFSET, 0);

  // 오늘(KST) 세션은 서버가 빼고 준다 — 정렬이 updated_at 이라 오늘 세션이 1페이지를 거의 다
  // 차지하면 과거가 몇 건만 남는다(실측: 20칸 중 14칸). 클라가 걸러내면 페이지 예산이 낭비된다.
  const startedBefore = kstDateStartIso(todayKstDate());

  const loaded = await loadPersistedPaperTradingSessionSummaries({
    // hasMore 판정용 1건 오버페치 — 별도 count 쿼리(전체 스캔) 없이 다음 페이지 유무만 알아낸다.
    limit: limit + 1,
    offset,
    decisionProvider: "cli-agent",
    startedBefore,
  });

  if (loaded.status === "error") {
    return NextResponse.json(
      { error: "과거 모의투자 내역을 불러오지 못했어요." },
      { status: 502, headers: NO_STORE },
    );
  }

  // 미설정(로컬 무DB·egress 차단)은 장애가 아니라 "저장소 꺼짐" — 클라가 재시도 대신 안내를 띄운다.
  if (loaded.status === "disabled") {
    const payload: PaperTradingSessionHistoryResponse = {
      sessions: [],
      positionsBySessionId: {},
      hasMore: false,
      nextOffset: offset,
      configured: false,
      generatedAt: new Date().toISOString(),
    };
    return NextResponse.json(payload, { headers: NO_STORE });
  }

  const morePages = loaded.sessions.length > limit;
  const page = morePages ? loaded.sessions.slice(0, limit) : loaded.sessions;
  // offset 상한에 닿으면 hasMore 를 내려 "더 보기"를 닫는다. 안 그러면 클라가 상한 너머 offset 을
  // 요청 → 서버가 다시 상한으로 clamp → **같은 페이지 반복**(중복 제거로 새 행 0)인데 버튼은
  // 계속 살아 있는 무한 루프가 된다(QA·리뷰 지적).
  const hasMore = morePages && offset + page.length < PAPER_TRADING_HISTORY_MAX_OFFSET;
  const positionsBySessionId: Record<string, PaperTradingPosition[]> = {};
  for (const entry of page) {
    positionsBySessionId[entry.session.id] = entry.positions;
  }

  const payload: PaperTradingSessionHistoryResponse = {
    sessions: page.map((entry) => entry.session),
    positionsBySessionId,
    hasMore,
    nextOffset: offset + page.length,
    configured: true,
    generatedAt: new Date().toISOString(),
  };
  return NextResponse.json(payload, { headers: NO_STORE });
}
