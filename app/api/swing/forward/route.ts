/**
 * `/api/swing/forward` BFF — 스윙 체크 전진 관찰(사후 성적), 관리자 전용.
 *
 * 스크리너 저장 행의 종가끼리 비교해 묶음별(매수 후보·관심·수급 충족·주의 …) 시장 대비 초과를 낸다.
 * 시세 API 를 부르지 않는다. 마지막 저장 거래일 단위로 KV 캐시(12시간).
 */

import { NextRequest, NextResponse } from "next/server";
import { getKisStore } from "@/lib/api/kis/store";
import { forwardStats } from "@/lib/swing/forward";
import { RULEBOOK } from "@/lib/swing/rulebook";
import { requireAdminApi } from "@/lib/server/auth/apiGuard";
import { isSwingStoreConfigured, latestSwingTradeDate, listSwingForwardRows } from "@/lib/server/swing/store";
import { addDays } from "@/lib/server/swing/tradeDate";
import type { SwingForwardResponse } from "@/lib/types/swing/api";

export const maxDuration = 60;

/** 관찰 창 — 약 3개월(오픈베타 기준 8주 판단에 충분). */
const WINDOW_DAYS = 100;
const HORIZONS = [1, 5, 10] as const;
const TTL_SEC = 12 * 3_600;

export async function GET(request: NextRequest) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;
  if (!isSwingStoreConfigured()) {
    return NextResponse.json({ error: "스윙 판정 저장소가 설정되지 않았어요." }, { status: 503 });
  }

  const latest = await latestSwingTradeDate(RULEBOOK.version);
  const key = `swing:forward:v1:${RULEBOOK.version}:${latest}`;
  const store = getKisStore();
  const cached = await store.get<SwingForwardResponse>(key).catch(() => null);
  if (cached) return NextResponse.json(cached, { headers: { "Cache-Control": "private, max-age=300" } });

  const rows = latest ? await listSwingForwardRows(addDays(latest, -WINDOW_DAYS), RULEBOOK.version) : [];
  if (rows === null) {
    return NextResponse.json({ error: "저장된 판정을 불러오지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
  const body: SwingForwardResponse = {
    latest,
    computedAt: new Date().toISOString(),
    horizons: forwardStats(rows, HORIZONS),
  };
  if (latest) await store.set(key, body, TTL_SEC).catch(() => undefined);
  return NextResponse.json(body, { headers: { "Cache-Control": "private, max-age=300" } });
}
