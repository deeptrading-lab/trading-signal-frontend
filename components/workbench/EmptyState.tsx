/**
 * 분석 전 빈 상태 — placeholder card.
 *
 * DESIGN.md 핸드오프 명세 "분석 전 (Empty)" 행 그대로:
 *   `card` × `body-sm` × `{colors.secondary}` + 문구
 *   "종목과 조건을 입력하면 분석 결과가 표시돼요."
 */

export function EmptyState() {
  return (
    <div className="emptyState" role="status" aria-live="polite">
      종목과 조건을 입력하면 분석 결과가 표시돼요.
    </div>
  );
}
