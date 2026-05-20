/**
 * 분석 폼 상태 관리 + 사전 차단.
 *
 * 입력은 모두 문자열로 유지 (입력 중 임시 상태 보존). 분석 시점에 `validateAnalyzePayload` 로 변환.
 * - 사전 차단: validate result `ok === false` → 필드별 한글 메시지 노출
 * - submit 핸들러: ok 면 `mutate(payload)` 를 호출하도록 호출 측이 받음
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import type { WhitelistItem } from "@/lib/types/workbench/whitelist";
import type { AnalyzeRequest } from "@/lib/types/workbench/analyze";
import {
  validateAnalyzePayload,
  type AnalyzeFieldKey,
  type AnalyzeValidationErrors,
} from "@/lib/validation/workbench/analyze";

export type AnalyzeFormState = {
  capital_amount: string;
  target_return_pct: string;
  target_period_days: string;
  max_loss_pct: string;
};

const INITIAL_STATE: AnalyzeFormState = {
  capital_amount: "",
  target_return_pct: "",
  target_period_days: "",
  max_loss_pct: "2",
};

export type UseAnalyzeFormResult = {
  selectedTicker: WhitelistItem | null;
  setSelectedTicker: (item: WhitelistItem | null) => void;
  form: AnalyzeFormState;
  setField: (key: keyof AnalyzeFormState, value: string) => void;
  errors: AnalyzeValidationErrors;
  isValid: boolean;
  /** 분석 가능한 payload 를 돌려준다. 사전 차단 실패 시 null, errors 가 채워진다. */
  attemptSubmit: () => AnalyzeRequest | null;
  resetErrors: () => void;
};

export function useAnalyzeForm(): UseAnalyzeFormResult {
  const [selectedTicker, setSelectedTicker] = useState<WhitelistItem | null>(null);
  const [form, setForm] = useState<AnalyzeFormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<AnalyzeValidationErrors>({});

  const setField = useCallback((key: keyof AnalyzeFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // 필드 수정 시 해당 필드 에러는 즉시 클리어 (사용자 흐름).
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key as AnalyzeFieldKey];
      return next;
    });
  }, []);

  const isValid = useMemo(() => {
    if (!selectedTicker) return false;
    const whitelist = [selectedTicker];
    const result = validateAnalyzePayload(
      {
        ticker: selectedTicker.ticker,
        capital_amount: form.capital_amount,
        target_return_pct: form.target_return_pct,
        target_period_days: form.target_period_days,
        max_loss_pct: form.max_loss_pct,
      },
      whitelist,
    );
    return result.ok;
  }, [selectedTicker, form]);

  const attemptSubmit = useCallback((): AnalyzeRequest | null => {
    const whitelist = selectedTicker ? [selectedTicker] : [];
    const result = validateAnalyzePayload(
      {
        ticker: selectedTicker?.ticker ?? "",
        capital_amount: form.capital_amount,
        target_return_pct: form.target_return_pct,
        target_period_days: form.target_period_days,
        max_loss_pct: form.max_loss_pct,
      },
      whitelist,
    );
    if (!result.ok) {
      setErrors(result.errors);
      return null;
    }
    setErrors({});
    return result.payload;
  }, [selectedTicker, form]);

  const resetErrors = useCallback(() => setErrors({}), []);

  return {
    selectedTicker,
    setSelectedTicker,
    form,
    setField,
    errors,
    isValid,
    attemptSubmit,
    resetErrors,
  };
}
