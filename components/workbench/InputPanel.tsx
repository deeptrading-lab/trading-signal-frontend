/**
 * 입력 패널 — 자본·목표 수익률·기간·최대 손실률 4개 필드 + 분석 버튼.
 *
 * v5 (component-compactness) 변경:
 *   - 단위 표기 (USD/%/일) 가 input 옆 별도 칼럼이 아닌 **input 필드 내부 우측 absolute suffix**.
 *     DESIGN.md v5 §Components / DOM 표준 그대로:
 *       <div class="relative">
 *         <input class="input pr-input-pr-suffix" />
 *         <span class="input-suffix absolute right-input-px top-1/2 -translate-y-1/2"
 *               aria-hidden="true">USD</span>
 *       </div>
 *   - input 컴팩트화 — h 36px / px 12 / py 8 / body-sm (합성 토큰 `input` / `input-error`).
 *   - 라벨은 `input-label` (label-sm 13/700/1.25), helper 는 `input-helper` / `input-helper-error`.
 *   - 분석 버튼 (`button-primary`) 은 합성 토큰 갱신으로 h 40px.
 *   - prop 시그니처 무수정 (PRD AC-18).
 *
 * 사전 차단(`validateAnalyzePayload`) 실패 시 각 필드는 `input-error` + helper text(`input-helper-error`).
 * 분석 버튼은 ticker + 4필드 모두 통과일 때만 활성. 비활성 시 aria-disabled.
 */

"use client";

import { useId } from "react";
import type { WhitelistItem } from "@/lib/types/workbench/whitelist";
import type { AnalyzeValidationErrors } from "@/lib/validation/workbench/analyze";
import type { AnalyzeFormState } from "@/hooks/workbench/useAnalyzeForm";
import { cn } from "@/lib/utils/cn";

type Props = {
  selectedTicker: WhitelistItem | null;
  form: AnalyzeFormState;
  setField: (key: keyof AnalyzeFormState, value: string) => void;
  errors: AnalyzeValidationErrors;
  isValid: boolean;
  isPending: boolean;
  onSubmit: () => void;
};

// v5: 라벨 위 + input 아래 helper 구조 (PRD §9.5 결정). gap 은 4px (gap-xs).
const FIELD_WRAP = "grid gap-xs";

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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-md mb-md p-lg bg-surface border border-border-line rounded-sm">
      {/* capital_amount — suffix: 통화 (선택 전 "-") */}
      <div className={cn(FIELD_WRAP, "sm:col-span-2")}>
        <label htmlFor={capitalId} className="input-label">
          투자 가능 금액
        </label>
        <InputWithSuffix
          id={capitalId}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          hasError={Boolean(errors.capital_amount)}
          placeholder="예: 1000000"
          value={form.capital_amount}
          onChange={(value) => setField("capital_amount", value)}
          describedById={errors.capital_amount ? `${capitalId}-helper` : undefined}
          suffix={currencyLabel}
        />
        {errors.capital_amount ? (
          <p id={`${capitalId}-helper`} className="input-helper-error">
            {errors.capital_amount}
          </p>
        ) : (
          <p className="input-helper">선택한 종목의 통화 단위로 입력해 주세요.</p>
        )}
      </div>

      {/* target_return_pct — suffix: % */}
      <div className={cn(FIELD_WRAP, "sm:col-span-2")}>
        <label htmlFor={returnId} className="input-label">
          목표 수익률
        </label>
        <InputWithSuffix
          id={returnId}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          hasError={Boolean(errors.target_return_pct)}
          placeholder="예: 5"
          value={form.target_return_pct}
          onChange={(value) => setField("target_return_pct", value)}
          describedById={errors.target_return_pct ? `${returnId}-helper` : undefined}
          suffix="%"
        />
        {errors.target_return_pct ? (
          <p id={`${returnId}-helper`} className="input-helper-error">
            {errors.target_return_pct}
          </p>
        ) : (
          <p className="input-helper">0 이상의 숫자를 입력해 주세요.</p>
        )}
      </div>

      {/* target_period_days — suffix: 일 */}
      <div className={FIELD_WRAP}>
        <label htmlFor={periodId} className="input-label">
          목표 기간
        </label>
        <InputWithSuffix
          id={periodId}
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          hasError={Boolean(errors.target_period_days)}
          placeholder="예: 30"
          value={form.target_period_days}
          onChange={(value) => setField("target_period_days", value)}
          describedById={errors.target_period_days ? `${periodId}-helper` : undefined}
          suffix="일"
        />
        {errors.target_period_days ? (
          <p id={`${periodId}-helper`} className="input-helper-error">
            {errors.target_period_days}
          </p>
        ) : (
          <p className="input-helper">1 이상의 정수.</p>
        )}
      </div>

      {/* max_loss_pct — suffix: % */}
      <div className={FIELD_WRAP}>
        <label htmlFor={lossId} className="input-label">
          거래당 최대 손실률
        </label>
        <InputWithSuffix
          id={lossId}
          type="number"
          inputMode="decimal"
          min="0"
          max="5"
          step="any"
          hasError={Boolean(errors.max_loss_pct)}
          placeholder="예: 2"
          value={form.max_loss_pct}
          onChange={(value) => setField("max_loss_pct", value)}
          describedById={errors.max_loss_pct ? `${lossId}-helper` : undefined}
          suffix="%"
        />
        {errors.max_loss_pct ? (
          <p id={`${lossId}-helper`} className="input-helper-error">
            {errors.max_loss_pct}
          </p>
        ) : (
          <p className="input-helper">0보다 크고 5 이하.</p>
        )}
      </div>

      {/* 분석 버튼 — full width, 40px height (button-primary 합성 토큰) */}
      <button
        type="button"
        className="button-primary sm:col-span-2"
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

/**
 * input + 우측 absolute suffix DOM 묶음.
 *
 * - wrapper: position: relative.
 * - input: 우측 padding 만 `pr-input-pr-suffix` (44px) 로 확장. 좌우 padding 동일하지 않음.
 * - suffix: position: absolute right: var(--spacing-input-px), 수직 가운데, pointer-events: none.
 *   aria-hidden="true" — 단위는 라벨 텍스트 또는 helper 에 포함되는 게 정상이며
 *   스크린리더가 suffix 를 중복 읽지 않게 hidden.
 */
type InputWithSuffixProps = {
  id: string;
  type: string;
  inputMode?: "decimal" | "numeric";
  min?: string;
  max?: string;
  step?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  hasError: boolean;
  describedById?: string;
  suffix: string;
};

function InputWithSuffix({
  id,
  type,
  inputMode,
  min,
  max,
  step,
  placeholder,
  value,
  onChange,
  hasError,
  describedById,
  suffix,
}: InputWithSuffixProps) {
  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        min={min}
        max={max}
        step={step}
        // 합성 토큰 `input` / `input-error` 가 좌우 `px-input-px` 를 갖고 있으므로
        // 우측만 suffix 폭으로 오버라이드. (Tailwind 의 `pr-*` 는 단일 방향이라 안전 오버라이드.)
        className={cn(hasError ? "input-error" : "input", "pr-input-pr-suffix")}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={hasError}
        aria-describedby={describedById}
      />
      <span
        aria-hidden="true"
        className="input-suffix absolute right-input-px top-1/2 -translate-y-1/2"
      >
        {suffix}
      </span>
    </div>
  );
}
