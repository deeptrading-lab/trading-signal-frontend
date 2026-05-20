/**
 * 메인 = 워크벤치 (DESIGN.md OPEN QUESTION #7 결정).
 *
 * 구조 (위→아래):
 *   topBar → SearchPanel → InputPanel → ResultGroup (empty | loading | success | error)
 *
 * 사전 차단:
 *   - 분석 버튼 활성: ticker 선택 + 4필드 validateAnalyzePayload OK
 *   - 비활성 시 aria-disabled + helper text
 *
 * 호출 경로 (모두 도메인 훅 경유 — TanStack Query 인터페이스 누출 0건):
 *   - 화이트리스트: useTickerSearch → useQueryWhitelistSearch → searchWhitelist → /api/whitelist/search → FastAPI
 *   - 분석:        useAnalyzeRun  → useMutationAnalyzeWorkbench → analyzeWorkbench → /api/workbench/analyze → FastAPI
 *   직접 fetch · 127.0.0.1 호출 0건 (AC-11).
 */

"use client";

import { SearchPanel } from "@/components/workbench/SearchPanel";
import { InputPanel } from "@/components/workbench/InputPanel";
import { ResultGroup } from "@/components/workbench/ResultGroup";
import { useAnalyzeForm } from "@/hooks/workbench/useAnalyzeForm";
import { useAnalyzeRun } from "@/hooks/workbench/useAnalyzeRun";

export default function Home() {
  const {
    selectedTicker,
    setSelectedTicker,
    form,
    setField,
    errors,
    isValid,
    attemptSubmit,
  } = useAnalyzeForm();

  const {
    submit,
    isPending,
    isError,
    error,
    data,
    reset,
  } = useAnalyzeRun();

  function handleSubmit() {
    const payload = attemptSubmit();
    if (!payload) return;
    submit(payload);
  }

  function handleRetry() {
    reset();
  }

  const resultState: "empty" | "loading" | "success" | "error" = isPending
    ? "loading"
    : isError
      ? "error"
      : data
        ? "success"
        : "empty";

  return (
    <main className="w-[min(480px,100%)] mx-auto px-lg pt-[18px] pb-[28px]">
      <header className="flex justify-between items-start gap-md mb-lg">
        <div>
          <p className="text-caption text-secondary">TradingSignalEngine</p>
          <h1 className="mt-xs text-h1">워크벤치</h1>
        </div>
        <div className="text-right text-caption text-secondary">
          {selectedTicker ? (
            <>
              <strong className="block mb-xs text-body-sm font-bold text-primary">
                {selectedTicker.ticker}
              </strong>
              <span>
                {selectedTicker.name} ({selectedTicker.currency})
              </span>
            </>
          ) : (
            <span>종목 선택 필요</span>
          )}
        </div>
      </header>

      <SearchPanel
        selectedTicker={selectedTicker}
        onSelect={setSelectedTicker}
      />

      <InputPanel
        selectedTicker={selectedTicker}
        form={form}
        setField={setField}
        errors={errors}
        isValid={isValid}
        isPending={isPending}
        onSubmit={handleSubmit}
      />

      <ResultGroup
        state={resultState}
        data={data}
        error={error}
        onRetry={handleRetry}
      />

      <footer className="grid gap-xs mt-lg px-[2px] text-caption text-secondary">
        <span>투자 판단 보조 자료입니다. 자동 주문이나 수익 보장을 의미하지 않습니다.</span>
      </footer>
    </main>
  );
}
