/**
 * KIS 호출 페이서 — 스윙 스크리너 크론 1회 호출 안에서 공유한다.
 *
 * prod KIS 키는 사용자 트래픽과 한도(초당 약 20건)를 같이 쓰므로 호출 시작 간격을 gapMs 이상으로
 * 벌린다(기본 125ms = 초당 8건). 초당 건수 초과·토큰 만료·세션 포화·5xx·네트워크는 일시 오류로 보고
 * 짧게 쉬었다 다시 시도한다.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 재시도할 만한 KIS 오류인가 — ApiError(kind/status/detail.msg_cd) 모양을 본다. */
export function isTransientKisError(e: unknown): boolean {
  const err = e as { kind?: string; status?: number; detail?: { msg_cd?: string } } | null;
  const msgCd = err?.detail?.msg_cd;
  return (
    msgCd === "EGW00201" || // 초당 거래건수 초과
    msgCd === "EGW00123" || // 토큰 만료
    msgCd === "OPSQ1002" || // SESSION FULL
    err?.kind === "network" ||
    (err?.status !== undefined && err.status >= 500)
  );
}

export type KisCall = <T>(fn: () => Promise<T>) => Promise<T>;

export function createKisPacer(gapMs = 125, retries = 2, retryDelayMs = 800): KisCall {
  let next = 0;
  const slot = async () => {
    const now = Date.now();
    const at = Math.max(now, next);
    next = at + gapMs;
    if (at > now) await sleep(at - now);
  };
  return async function call<T>(fn: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      await slot();
      try {
        return await fn();
      } catch (e) {
        if (attempt < retries && isTransientKisError(e)) {
          await sleep(retryDelayMs * (attempt + 1));
          continue;
        }
        throw e;
      }
    }
  };
}
