/**
 * `/api/cron/flow-snapshot` — 수급(외국인·기관 순매수) 스냅샷 적립 cron.
 *
 * PRD `investor-flow-cumulative` §4.A / §6.
 *
 * - 장 마감 뒤 자동 호출 중지 정책으로 Vercel/GitHub 예약 스케줄은 제거했다. 필요할 때
 *   GitHub `workflow_dispatch` 또는 인증된 수동 호출로 수급 스냅샷만 적립한다.
 *   (옛 AI 판정 채점·backfill·터치 스캔 단계는 그 파이프라인 삭제와 함께 없앴다 — swing-judgment PR-5.)
 * - **인증**: `Authorization: Bearer ${CRON_SECRET}` 필수(Vercel Cron 자동 부착). 미일치 401.
 * - 외국인·기관 각각 `fetchForeignInstitutionTotal` → **전 행** 저장(top10 slice 안 함, 누적 커버리지).
 * - transient(EGW00201/네트워크) 1회 재시도(`fetchWithTransientRetry`). 2콜 간 delay 로 한도 회피.
 * - **fail-soft**: 휴장/빈응답/실패는 저장 skip 후 200(cron 재시도 폭주 방지). KIS 미설정/비-prod 도 skip.
 * - **q1 PoC**: 반환 행 수를 `console.info` 로 로깅 — 누적 랭킹 근사 오차 판단용(전시장 vs 상위 N행).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  fetchForeignInstitutionTotal,
  isKisConfigured,
  resolveKisEnv,
  type ForeignInstitutionSubject,
} from "@/lib/api/kis";
import { saveFlowSnapshot, saveFlowCronMeta } from "@/lib/server/flowSnapshotStore";
import { delay, fetchWithTransientRetry } from "@/lib/server/bffUtils";

const SUBJECT_DELAY_MS = 200; // 주체 2콜 간 지연 — EGW00201 회피.
const RETRY_BACKOFF_MS = 250;
const SUBJECTS: ForeignInstitutionSubject[] = ["frgn", "orgn"];

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const env = resolveKisEnv();

  // KIS 미설정/비-prod → 적립 skip(랭킹 TR 은 prod 전용 가능성). 재시도 폭주 막으려 200.
  if (!isKisConfigured() || env !== "prod") {
    // 헬스 마커 — 로그 없이도 cron 건강 확인용(/api/flow/cron-status).
    await saveFlowCronMeta({ at: new Date().toISOString(), ok: false, reason: "kis-not-prod", env });
    return NextResponse.json({ ok: false, reason: "kis-not-prod", env }, { status: 200 });
  }

  const saved: Record<string, number> = {};
  let ok = true;
  try {
    for (const subject of SUBJECTS) {
      const rows = await fetchWithTransientRetry(
        () => fetchForeignInstitutionTotal(subject),
        [],
        RETRY_BACKOFF_MS,
      );
      // q1 PoC — 반환 행 수 로깅(전시장이면 수백, 상위 N행이면 수십).
      console.info(`[flow-snapshot] subject=${subject} rows=${rows.length}`);
      if (rows.length > 0) {
        await saveFlowSnapshot(subject, rows);
        saved[subject] = rows.length;
      }
      await delay(SUBJECT_DELAY_MS);
    }
    // 헬스 마커 — 마지막 실행 시각/저장 결과. saved 가 비면 휴장/빈응답.
    await saveFlowCronMeta({ at: new Date().toISOString(), ok: true, env, saved });
  } catch (error) {
    ok = false;
    console.warn("[flow-snapshot] 수급 적립 실패", error);
    await saveFlowCronMeta({ at: new Date().toISOString(), ok: false, reason: "flow-error", env });
  }

  return NextResponse.json({ ok, saved }, { status: 200 });
}
