/**
 * 입력 패널 — 자본·목표 수익률·기간·최대 손실률 4개 필드 + 분석 버튼.
 *
 * DESIGN.md OPEN QUESTION #3 결정 그대로:
 *   - capital_amount 두 번째 칼럼에 ticker.currency 보조 라벨 ("-" 면 선택 전)
 *   - target_period_days / max_loss_pct 두 번째 칼럼에 단위 라벨 (일, %)
 *
 * 사전 차단(`validateAnalyzePayload`) 실패 시 각 필드는 `input-error` + helper text(`{colors.critical}`).
 * 분석 버튼은 ticker + 4필드 모두 통과일 때만 활성. 비활성 시 aria-disabled.
 */

"use client";

import { useId } from "react";
import type { WhitelistItem } from "@/lib/types/workbench/whitelist";
import type { AnalyzeValidationErrors } from "@/lib/validation/workbench/analyze";
import type { AnalyzeFormState } from "@/hooks/workbench/useAnalyzeForm";

type Props = {
  selectedTicker: WhitelistItem | null;
  form: AnalyzeFormState;
  setField: (key: keyof AnalyzeFormState, value: string) => void;
  errors: AnalyzeValidationErrors;
  isValid: boolean;
  isPending: boolean;
  onSubmit: () => void;
};

const FIELD_WRAP = "grid gap-sm";
const FIELD_FULL = "grid gap-sm col-span-2";
const LABEL = "text-caption text-secondary";
const UNIT = "flex items-end pb-md text-body-sm text-secondary";
const HELPER = "mt-xs text-caption text-secondary";
const HELPER_CRITICAL = "mt-xs text-caption text-critical";

export function InputPanel({
  selectedTicker,
  form,
  setField,
  errors,
  isValid,
  isPending,
  onSubmit,
}: Props) {
  const capitalId = useId();
  const returnId = useId();
  const periodId = useId();
  const lossId = useId();

  const currencyLabel = selectedTicker?.currency ?? "-";

  return (
    <div className="grid grid-cols-[1fr_92px] gap-md mb-md p-lg bg-panel border border-line rounded-sm">
      {/* capital_amount */}
      <div className={FIELD_WRAP}>
        <label htmlFor={capitalId} className={LABEL}>
          투자 가능 금액
        </label>
        <input
          id={capitalId}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          className={errors.capital_amount ? "input-error" : "input"}
          placeholder="예: 1000000"
          value={form.capital_amount}
          onChange={(e) => setField("capital_amount", e.target.value)}
          aria-invalid={Boolean(errors.capital_amount)}
          aria-describedby={errors.capital_amount ? `${capitalId}-helper` : undefined}
        />
        {errors.capital_amount ? (
          <p id={`${capitalId}-helper`} className={HELPER_CRITICAL}>
            {errors.capital_amount}
          </p>
        ) : (
          <p className={HELPER}>선택한 종목의 통화 단위로 입력해 주세요.</p>
        )}
      </div>
      <div className={UNIT} aria-hidden="true">{currencyLabel}</div>

      {/* target_return_pct (full row) */}
      <div className={FIELD_FULL}>
        <label htmlFor={returnId} className={LABEL}>
          목표 수익률 (%)
        </label>
        <input
          id={returnId}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          className={errors.target_return_pct ? "input-error" : "input"}
          placeholder="예: 5"
          value={form.target_return_pct}
          onChange={(e) => setField("target_return_pct", e.target.value)}
          aria-invalid={Boolean(errors.target_return_pct)}
          aria-describedby={errors.target_return_pct ? `${returnId}-helper` : undefined}
        />
        {errors.target_return_pct ? (
          <p id={`${returnId}-helper`} className={HELPER_CRITICAL}>
            {errors.target_return_pct}
          </p>
        ) : (
          <p className={HELPER}>0 이상의 숫자를 입력해 주세요.</p>
        )}
      </div>

      {/* target_period_days */}
      <div className={FIELD_WRAP}>
        <label htmlFor={periodId} className={LABEL}>
          목표 기간
        </label>
        <input
          id={periodId}
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          className={errors.target_period_days ? "input-error" : "input"}
          placeholder="예: 30"
          value={form.target_period_days}
          onChange={(e) => setField("target_period_days", e.target.value)}
          aria-invalid={Boolean(errors.target_period_days)}
          aria-describedby={errors.target_period_days ? `${periodId}-helper` : undefined}
        />
        {errors.target_period_days ? (
          <p id={`${periodId}-helper`} className={HELPER_CRITICAL}>
            {errors.target_period_days}
          </p>
        ) : (
          <p className={HELPER}>1 이상의 정수(일).</p>
        )}
      </div>
      <div className={UNIT} aria-hidden="true">일</div>

      {/* max_loss_pct */}
      <div className={FIELD_WRAP}>
        <label htmlFor={lossId} className={LABEL}>
          거래당 최대 손실률
        </label>
        <input
          id={lossId}
          type="number"
          inputMode="decimal"
          min="0"
          max="5"
          step="any"
          className={errors.max_loss_pct ? "input-error" : "input"}
          placeholder="예: 2"
          value={form.max_loss_pct}
          onChange={(e) => setField("max_loss_pct", e.target.value)}
          aria-invalid={Boolean(errors.max_loss_pct)}
          aria-describedby={errors.max_loss_pct ? `${lossId}-helper` : undefined}
        />
        {errors.max_loss_pct ? (
          <p id={`${lossId}-helper`} className={HELPER_CRITICAL}>
            {errors.max_loss_pct}
          </p>
        ) : (
          <p className={HELPER}>0보다 크고 5 이하.</p>
        )}
      </div>
      <div className={UNIT} aria-hidden="true">%</div>

      {/* 분석 버튼 */}
      <button
        type="button"
        className="button-primary col-span-2"
        onClick={onSubmit}
        disabled={!isValid || isPending}
        aria-disabled={!isValid || isPending}
        aria-busy={isPending}
      >
        {isPending ? "분석 중" : "분석"}
      </button>
    </div>
  );
}
