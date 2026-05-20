/**
 * BE 에러 매핑 카드.
 *
 * DESIGN.md 핸드오프 명세 "BE 4xx" / "BE 5xx · 네트워크 실패" 행 그대로:
 *   - validation / whitelist_miss → card-critical + BE detail 한글이면 그대로, 영문이면 fallback
 *   - network / server → card-critical + "엔진에 일시적인 문제…" + "다시 시도" 버튼
 *   - aria-live="polite"
 */

import type { ApiError } from "@/lib/api/errors";
import { getErrorMessage, isRetryable } from "@/lib/copy/workbench/errorMessages";

type Props = {
  error: ApiError;
  onRetry: () => void;
};

export function ErrorCard({ error, onRetry }: Props) {
  const message = getErrorMessage(error);
  const retryable = isRetryable(error);
  return (
    <div className="card-critical" role="alert" aria-live="polite">
      <p className="text-body-sm text-critical">{message}</p>
      {retryable ? (
        <div className="mt-md">
          <button
            type="button"
            className="button-secondary"
            onClick={onRetry}
          >
            다시 시도
          </button>
        </div>
      ) : null}
    </div>
  );
}
