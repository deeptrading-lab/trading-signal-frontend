/**
 * 시황 자동 갱신 스케줄러 — crontab 대체(로컬 in-process). `instrumentation.ts` 가 서버 부팅 시 1회 기동.
 *
 * 기존 `scripts/cron/refresh-market-analysis.sh`(평일 09:00~15:30 KST 30분마다 `?refresh=1`)를
 * dev 서버 프로세스 안의 타이머로 옮긴 것 — 동료가 각자 crontab 을 깔 필요가 없다.
 *
 * 단일 오너 게이트: `MARKET_REFRESH_SELF_SCHEDULE=1` 일 때만 동작(기본 off). 시황은 공유 Supabase 에
 *   append 되므로, 동료들이 *각자* 켜면 중복 row·중복 CLI 합성이 쌓인다 → 지정 호스트 한 명만 켠다.
 * Vercel 가드: 서버리스는 타이머를 유지 못 하고 CLI 도 없다 → `isVercelEnv()` 면 즉시 no-op.
 *   (prod 는 `?mode=latest` 로 마지막 로컬 생성본을 읽기만 한다.)
 */

import { isVercelEnv } from "@/lib/server/env";
import { createLogger } from "@/lib/server/logTag";
import { isKstMarketHours } from "@/lib/utils/kstMarketHours";

let started = false;

/**
 * 시황 자동 갱신 타이머 기동(멱등 — 중복 호출 무시). 장중에만 `refreshMarketAnalysis` 를 호출한다.
 * 게이트(Vercel·플래그) 미통과 시 조용히 no-op.
 */
export function startMarketRefreshScheduler(): void {
  if (started) return;
  if (isVercelEnv()) return; // 서버리스: 타이머 미유지 + CLI 부재
  if (process.env.MARKET_REFRESH_SELF_SCHEDULE !== "1") return; // 단일 오너 게이트(기본 off)
  started = true;

  const log = createLogger("market/scheduler");
  const rawInterval = Number(process.env.MARKET_REFRESH_INTERVAL_MIN);
  const intervalMin = Number.isFinite(rawInterval) && rawInterval >= 1 ? rawInterval : 30;

  const tick = async (): Promise<void> => {
    if (!isKstMarketHours()) return;
    try {
      // 동적 import — 부팅 경로(instrumentation)에서 KIS/Supabase 의존 모듈 즉시 로딩 회피.
      const { refreshMarketAnalysis } = await import("@/lib/server/market/refreshMarketAnalysis");
      const r = await refreshMarketAnalysis({});
      log(`자동 갱신 — cli=${r.cliInvoked ? 1 : 0} degraded=${r.degraded ? 1 : 0} pruned=${r.pruned}`);
    } catch (error) {
      log.warn("자동 갱신 실패(무해 — 다음 주기 재시도)", error);
    }
  };

  // 부팅 직후 1회(장중이면) + 이후 주기. 서버가 아직 listen 전이어도 직접 함수 호출이라 무관.
  void tick();
  const timer = setInterval(() => void tick(), intervalMin * 60_000);
  // 타이머가 프로세스 종료를 막지 않도록(테스트·graceful shutdown).
  timer.unref?.();
  log(`시황 자동 갱신 스케줄러 시작 — ${intervalMin}분 간격(평일 장중만)`);
}
