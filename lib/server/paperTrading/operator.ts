/**
 * 서버 운영자(operator) 식별자 — 공유 Supabase 를 여러 로컬 서버가 함께 쓸 때 "이 세션은 누구
 * 서버의 것" 인지 구분하는 소유자 키(intraday-session-owner).
 *
 * ★ 로그인 이메일을 쓸 수 없는 이유: 틱 스케줄러는 요청 없는 `setInterval`(쿠키·신원 접근 불가)에서
 *   돌아 request-time 신원을 알 수 없다. 소유자 게이트가 성립하려면 **생성 시 스탬프**와 **스케줄링
 *   시 비교**가 같은 값이어야 하므로, request-less 로 안정적으로 얻는 값이어야 한다. 그래서 명시
 *   env(`INTRADAY_OPERATOR`) 우선 · Node `os.hostname()` 폴백 · 최후 "local" 을 쓴다. 프로세스
 *   수명 동안 고정이라 생성/틱/마감 판정이 항상 같은 소유자로 일치한다.
 *
 * ⚠️ 서버 전용(`os` 는 브라우저 번들에 못 들어감) — "use client" 컴포넌트에서 import 금지.
 *   클라이언트는 목록 API 응답의 `currentOperator` 로만 "내 서버가 누구인지"를 안다.
 */

import { hostname } from "os";

/** payload(jsonb)·배지 라벨에 담기므로 과도한 길이는 잘라 저장/표시를 안정화(64자 상한). */
const OPERATOR_MAX_LENGTH = 64;

export function resolveServerOperator(): string {
  const raw = process.env.INTRADAY_OPERATOR?.trim() || hostname() || "local";
  return raw.slice(0, OPERATOR_MAX_LENGTH);
}
