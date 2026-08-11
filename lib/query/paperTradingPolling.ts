/**
 * 단타 모의투자 폴링 주기 결정 — 순수 함수(now 주입 가능). intraday-live-refresh.
 *
 * ★★ 이 모듈이 존재하는 이유 = 교착 재발 방지.
 *
 * 예전에는 `useIntradayPaperRefresh(runningSessionIds)` 라는 명령형 타이머가 유일한 갱신 장치였는데,
 * `if (ids.length === 0) return;` 로 **"실행 중 세션을 이미 알고 있을 때만"** 타이머를 돌렸다.
 * 그런데 그 목록을 갱신하는 게 바로 그 타이머다 — 폴러의 입력이 폴러의 산출물이었다. 캐시된 목록이
 * 비어 있으면 타이머가 안 돌고, 안 도니 목록도 안 바뀌어서 **새 세션은 새로고침 전까지 영영 안 뜬다**.
 * 오토파일럿이 특히 크게 물렸다(POST 는 런만 만들고 자식 세션은 60초 서버 스윕이 나중에 만든다 →
 * mutation 시점 무효화로는 발견 불가, 지속 폴링만이 유일한 발견 경로).
 *
 * 그래서 목록 폴링 주기는 **세션 데이터를 인자로 받지 않는다**. 시각만 본다.
 */

import { isKstMarketHoursWithCloseGrace } from "@/lib/utils/kstMarketHours";
import { queryConfig } from "@/lib/query/queryConfig";
import type { PaperTradingSessionDetail } from "@/lib/types/paperTrading/paperTrading";

/**
 * 세션 목록 폴링 주기(ms).
 *
 * ⚠️ 절대 `false` 를 반환하지 않는다. "실행 중 세션이 없으니 끄자" 는 위 교착의 정확한 재발 경로다 —
 * 실행 중 세션이 생겼다는 사실 자체를 이 폴링으로만 알 수 있다.
 */
export function paperSessionsRefetchInterval(now: Date = new Date()): number {
  return isKstMarketHoursWithCloseGrace(now)
    ? queryConfig.paperTrading.sessionsPollMs
    : queryConfig.paperTrading.sessionsIdlePollMs;
}

/**
 * 세션 상세 폴링 주기(ms) 또는 `false`(정지).
 *
 * - 데이터 없음 → 정지(첫 로드 후 판단).
 * - `completed`/`failed` → 영구 정지(더 바뀔 게 없다).
 * - 장외·주말 → 정지(서버 스케줄러도 안 돈다).
 * - **`paused` 는 계속 폴링한다**: 행은 `detail?.session ?? session` 을 우선하므로, 다른 탭/서버에서
 *   재개해도 상세 캐시가 `paused` 에 고착되면 목록 갱신만으로는 복구되지 않는다(상세 쿼리 키 불변).
 */
export function paperSessionRefetchInterval(
  detail: Pick<PaperTradingSessionDetail, "session"> | undefined,
  now: Date = new Date(),
): number | false {
  if (!detail) return false;
  const { status } = detail.session;
  if (status === "completed" || status === "failed") return false;
  if (!isKstMarketHoursWithCloseGrace(now)) return false;
  return queryConfig.paperTrading.sessionPollMs;
}
