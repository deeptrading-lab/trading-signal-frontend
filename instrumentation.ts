/**
 * Next.js instrumentation — 서버 프로세스 부팅 시 1회 실행(`register`).
 *
 * 용도: 시황 자동 갱신 + 단타 자동 틱 스케줄러 기동(로컬 crontab 대체). 게이트는 각 스케줄러가
 *   자체 판단(Vercel/플래그 미통과 시 no-op)하므로 여기선 nodejs 런타임에서 호출만 한다.
 *   edge 런타임에서는 서버 전용 모듈(KIS/Supabase)을 못 쓰므로 제외.
 *
 * @see lib/server/market/refreshScheduler.ts
 * @see lib/server/paperTrading/tickScheduler.ts
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startMarketRefreshScheduler } = await import(
    "@/lib/server/market/refreshScheduler"
  );
  startMarketRefreshScheduler();
  const { startIntradayTickScheduler } = await import(
    "@/lib/server/paperTrading/tickScheduler"
  );
  startIntradayTickScheduler();
}
