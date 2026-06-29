/**
 * AI 분석 전역 동시성 세마포어 — **순수 카운터**. (PRD analysis-request-queue §3-5)
 *
 * 실행이 실제 일어나는 route handler 프로세스(`next dev` 단일 프로세스)에서, 브라우저·봇·워커 등
 * **모든 출처 합산** 동시 실행이 전역 N(=MAX_CONCURRENT)을 넘지 않도록 카운터로 캡한다.
 * over-cap 호출은 `tryAcquire()` 가 false 를 돌려 핸들러가 429/busy 로 거절한다(G3/AC-7).
 *
 * ⚠️⚠️ **요청 데이터 절대 금지(AC-8 / R1 / A5).**
 *   이 모듈 스코프에는 **카운터(정수)와 상수만** 둔다. ticker·runId·state·decision 등
 *   요청별 데이터를 모듈 스코프에 담는 순간 "module-level 가변상태 0 = 요청 격리" 원칙이 깨져
 *   PM 결과 섞임이 재발한다(`concurrent-ai-analysis` 조사 결론). 카운터 외 어떤 요청 데이터도 두지 않는다.
 *
 * HMR/중복 모듈 인스턴스에도 단일 카운터를 보장하려고 `globalThis` 에 정수 1개만 고정한다
 * (요청 데이터가 아니라 순수 카운터이므로 격리 원칙과 무관 — 오히려 프로세스 전역 캡의 정확성을 높인다).
 */

/** 전역 동시 실행 상한 N. PRD 고정값 3(클라이언트 캡 MAX_CONCURRENT_ANALYSES 와 동일 의미). */
export const MAX_CONCURRENT = 3;

/** 카운터를 담는 전역 심볼 키 — HMR·중복 모듈에도 단일 카운터 공유. */
const COUNTER_KEY = Symbol.for("ai-analysis.concurrencyGate.count");

type CounterHolder = { [COUNTER_KEY]?: number };

function holder(): CounterHolder {
  return globalThis as unknown as CounterHolder;
}

function read(): number {
  return holder()[COUNTER_KEY] ?? 0;
}

function write(next: number): void {
  holder()[COUNTER_KEY] = next;
}

/**
 * 슬롯 1개를 점유 시도. 현재 카운트 < N 이면 +1 후 true, 가득 찼으면 false(점유 안 함).
 *
 * 호출 측은 true 일 때만 분석을 시작하고, **모든 종료 경로에서 정확히 1번 `release()`** 해야 한다
 * (acquire 성공당 release 1번 — 중복 release 는 카운터를 음수로 만들지 않게 하단에서 0 클램프).
 */
export function tryAcquire(): boolean {
  const cur = read();
  if (cur >= MAX_CONCURRENT) return false;
  write(cur + 1);
  return true;
}

/** 점유했던 슬롯 1개 반납. 카운터는 0 미만으로 내려가지 않게 클램프(중복 release 방어). */
export function release(): void {
  const cur = read();
  write(cur > 0 ? cur - 1 : 0);
}

/** 현재 점유 수(테스트·관측용). */
export function currentCount(): number {
  return read();
}

/** 테스트 전용 — 카운터 리셋. */
export function resetForTest(): void {
  write(0);
}
