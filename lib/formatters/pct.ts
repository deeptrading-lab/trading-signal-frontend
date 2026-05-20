/**
 * 퍼센트 포맷터.
 *
 * 입력은 이미 퍼센트 단위 숫자(예: `5` → `"5%"`). 단위는 한글이 아닌 `%` 기호 사용.
 */

export function formatPct(
  value: number | null | undefined,
  options?: { digits?: number; sign?: boolean },
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }
  const digits = options?.digits ?? (Math.abs(value) >= 100 ? 0 : 2);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: options?.sign ? "exceptZero" : "auto",
  }).format(value);
  return `${formatted}%`;
}
