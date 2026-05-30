/**
 * 공유 비밀번호 constant-time 비교 (타이밍 공격 방지).
 *
 * PRD `app-password-gate` §3.3 / AC-11 / AC-19:
 *   - `process.env.APP_PASSWORD` 와 입력 비밀번호를 **상수 시간**으로 비교.
 *     길이 차이로 조기 반환하지 않는다(길이 자체도 누출 신호이므로 누적 비교 후 판정).
 *   - in-memory 카운터·계정 잠금(lockout) 비범위(§4) — 본 모듈은 비교만.
 *   - 비밀번호 값은 절대 반환·로그하지 않는다(에러 메시지에 노출 0).
 *
 * route handler(Node 런타임)에서 호출되지만 `Buffer` 미사용으로 Edge 호환 유지
 * (`session.ts` 의 비교 구현과 동일 전략 — 의존 단일화).
 */

/**
 * 게이트가 설정한 비밀번호와 입력 값을 constant-time 비교한다.
 *
 * @param input 사용자가 제출한 비밀번호.
 * @returns `APP_PASSWORD` 와 일치하면 true. 미설정이거나 불일치면 false.
 */
export function verifyPassword(input: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  return constantTimeEqual(input, expected);
}

/**
 * 두 문자열을 **상수 시간**으로 비교한다.
 *
 * - 길이가 달라도 early-return 하지 않고 길이 차이를 초기 누적값에 반영한 뒤,
 *   `max(len)` 만큼 전 구간을 OR-XOR 누적한다(첫 불일치에서 끊지 않음).
 */
function constantTimeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}
