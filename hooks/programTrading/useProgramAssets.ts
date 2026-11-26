"use client";
import { useState } from "react";
import { useMutationProgramAssets, useQueryProgramAssets } from "@/hooks/query/useQueryProgramAssets";
import { isProgramAssets } from "@/lib/validation/programTrading/assets";
import { PROGRAM_ASSETS_COPY as C } from "@/lib/copy/programTrading/assets";

export function useProgramAssets() {
  const query = useQueryProgramAssets();
  const mutation = useMutationProgramAssets();
  const [draft, setDraft] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string>();
  const value = draft ?? (query.data ? String(query.data.amount) : "");
  return {
    assets: query.data, value, loading: query.isLoading, pending: mutation.isPending,
    error: validationError ?? mutation.error?.message ?? query.error?.message,
    saved: mutation.isSuccess,
    reload: () => { void query.refetch(); },
    change: (next: string) => { setDraft(next); setValidationError(undefined); mutation.reset(); },
    save: () => {
      const parsed = Number(value.replaceAll(",", ""));
      if (!/^\d+(?:,\d{3})*$/.test(value) || !isProgramAssets(parsed)) { setValidationError(C.invalid); return; }
      setValidationError(undefined);
      mutation.mutate(parsed);
    },
  };
}
