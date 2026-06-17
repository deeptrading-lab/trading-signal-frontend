/**
 * `/api/flow/cron-status` — 수급 7일 누적 스냅샷 cron 헬스 진단(운영 점검용).
 *
 * Vercel 런타임 로그 보존(Hobby)에 의존하지 않고 cron 상태를 확인한다.
 * `/api/cron/*` 가 아니라 앱 비밀번호 게이트가 보호하는 경로 → 로그인 세션 필요, 노출 안전.
 *
 * 해석 가이드:
 * - `cronSecretSet=false` → CRON_SECRET 미설정. Vercel Cron 호출이 401 로 튕겨 적립 0 (#1 의심).
 * - `lastRun=null` → 적립 단계에 한 번도 도달 못 함(= 401 또는 cron 미실행). Cron Jobs 탭과 교차확인.
 * - `lastRun.ok=false, reason="kis-not-prod"` → 그 실행 시점 KIS 비-prod/미설정으로 skip.
 * - `lastRun.ok=true, saved={}` → 실행됐으나 빈 응답(휴장 등).
 * - `lastRun.ok=true, saved={frgn,orgn}` 인데 `cumulativeDays<7` → 정상, 영업일 적립 중.
 */

import { NextResponse } from "next/server";
import { isKisConfigured, resolveKisEnv } from "@/lib/api/kis";
import { readFlowCronMeta, readSnapshotCoverage } from "@/lib/server/flowSnapshotStore";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const [lastRun, frgn, orgn] = await Promise.all([
    readFlowCronMeta(),
    readSnapshotCoverage("frgn"),
    readSnapshotCoverage("orgn"),
  ]);

  return NextResponse.json({
    now: new Date().toISOString(),
    env: resolveKisEnv(),
    kisConfigured: isKisConfigured(),
    storeMode: process.env.KIS_TOKEN_STORE ?? "memory",
    cronSecretSet: !!process.env.CRON_SECRET,
    lastRun,
    coverage: { frgn, orgn },
    /** UI 가 보여줄 누적 영업일 수 — 두 주체 중 작은 값(0 이면 "모으는 중"). */
    cumulativeDays: Math.min(frgn.daysCount, orgn.daysCount),
  });
}
