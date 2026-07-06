/**
 * AI 생성 텍스트에서 **분석 대상 종목의 6자리 코드(티커)** 노출을 제거한다.
 *
 * 앱 전역 규칙은 "종목 코드 미표시"(이름만 노출)인데, 분석 프롬프트가 AI 에게 티커 코드를 주다 보니
 * AI 가 리포트·판정 본문에 코드를 그대로 쓰는 경우가 있다(예: `SK텔레콤(017670)에 대한 …`). prod 분석은
 * 봇에서 오므로, **표시 시점 strip** 이 소스(로컬/봇/큐)에 무관한 확실한 방어선이다.
 *
 * 순수 함수 — 부수효과 없음. 표시 직전 투영(provider projection)·저장 스냅샷 변환에서 호출한다.
 *
 * 안전장치:
 * - **분석 대상 티커만** 제거한다(정규식을 이 티커로 빌드) → 가격(84900)·연도(2024)·재무수치 등
 *   무관한 숫자는 절대 건드리지 않는다(오탐 방지).
 * - `ticker` 가 빈 문자열/null 이면 원문 그대로 반환. 텍스트에 티커가 없으면 원문 그대로 반환(불필요 정리 방지).
 * - `RegExp` 특수문자를 이스케이프해 주입/오작동을 막는다.
 * - 조립식 `new RegExp(...)` 만 사용(정규식 리터럴 lookbehind 회피) — 구형 Safari(<16.4) 호환.
 *   경계 판정은 lookbehind 없이 "선행 경계문자 캡처 후 복원"(`(^|[^\w.])` + `$1`)으로 처리한다.
 *
 * 커버 형태:
 * - 괄호 포함: `(017670)` · `(017670.KS)` — 괄호째 제거.
 * - 독립 코드: `017670` (단어 경계) — 제거. 앞이 숫자/점이면(예: `1.017670`, `3017670`) 미제거.
 * - 거래소 접미: `017670.KS` · `.KQ` · `.KX` · `.KRX` — 접미까지 함께 제거.
 */

/** 거래소 접미(선택) — Yahoo 스타일 `.KS`(KOSPI)/`.KQ`(KOSDAQ) 등. */
const EXCHANGE_SUFFIX = "(?:\\.(?:KS|KQ|KX|KRX))?";

/** 정규식 특수문자 이스케이프(티커를 리터럴로 취급). */
function escapeRegExp(source: string): string {
  return source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function stripTickerCode(
  text: string,
  ticker: string | null | undefined,
): string {
  if (!text) return text ?? "";
  const target = (ticker ?? "").trim();
  if (!target) return text;

  const core = `${escapeRegExp(target)}${EXCHANGE_SUFFIX}`;
  // ① 괄호 포함 `(017670)` — 괄호 안이 티커(+선택 접미)뿐일 때만 괄호째 제거.
  const parenthesized = new RegExp(`\\(\\s*${core}\\s*\\)`, "gi");
  // ② 독립 코드 — 선행 경계문자(문자열 시작 또는 \w·`.` 이 아닌 1글자)를 캡처해 복원($1),
  //    후행은 lookahead 로 \w 가 아님을 확인(코드가 더 큰 토큰의 일부면 미제거).
  const standalone = new RegExp(`(^|[^\\w.])${core}(?![\\w])`, "gi");

  const removed = text.replace(parenthesized, "").replace(standalone, "$1");
  // 티커가 실제로 없던 텍스트는 정리 로직도 태우지 않고 원문 그대로 돌려준다(안전).
  if (removed === text) return text;

  return removed
    .replace(/\(\s*\)/g, "") // 코드가 빠져 빈 괄호가 남으면 제거
    .replace(/[^\S\n]{2,}/g, " ") // 연속 수평 공백 → 1칸(개행은 보존)
    .replace(/[^\S\n]+([,.)\]·、:;])/g, "$1") // 구두점 앞 공백 제거
    .replace(/([([])[^\S\n]+/g, "$1") // 여는 괄호/대괄호 뒤 공백 제거
    .replace(/[^\S\n]+\n/g, "\n") // 줄 끝 공백 제거
    .trim();
}
