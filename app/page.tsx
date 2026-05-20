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
 * 호출 경로:
 *   - 화이트리스트: useTickerSearch → useWhitelistSearch → searchWhitelist → /api/whitelist/search → FastAPI
 *   - 분석: useAnalyzeWorkbench → analyzeWorkbench → /api/workbench/analyze → FastAPI
 *   직접 fetch · 127.0.0.1 호출 0건 (AC-11).
 */

"use client";

import { useState } from "react";
import { SearchPanel } from "@/components/workbench/SearchPanel";
import { InputPanel } from "@/components/workbench/InputPanel";
import { ResultGroup } from "@/components/workbench/ResultGroup";
import { useAnalyzeForm } from "@/hooks/use-analyze-form";
import { useAnalyzeWorkbench } from "@/lib/query/use-analyze-workbench";
import type { AnalyzeResponse } from "@/lib/types/workbench";

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

  const mutation = useAnalyzeWorkbench();
  const [lastResult, setLastResult] = useState<AnalyzeResponse | null>(null);

  function handleSubmit() {
    const payload = attemptSubmit();
    if (!payload) return;
    mutation.mutate(payload, {
      onSuccess: (response) => setLastResult(response),
    });
  }

  function handleRetry() {
    mutation.reset();
    setLastResult(null);
  }

  const resultState: "empty" | "loading" | "success" | "error" = mutation.isPending
    ? "loading"
    : mutation.isError
      ? "error"
      : lastResult
        ? "success"
        : "empty";

  return (
    <main className="mobileShell">
      <header className="topBar">
        <div className="topBarLeft">
          <p>TradingSignalEngine</p>
          <h1>워크벤치</h1>
        </div>
        <div className="topBarRight">
          {selectedTicker ? (
            <>
              <strong>{selectedTicker.ticker}</strong>
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
        isPending={mutation.isPending}
        onSubmit={handleSubmit}
      />

      <ResultGroup
        state={resultState}
        data={lastResult}
        error={mutation.error ?? null}
        onRetry={handleRetry}
      />

      <footer className="mobileFooter">
        <span>투자 판단 보조 자료입니다. 자동 주문이나 수익 보장을 의미하지 않습니다.</span>
      </footer>
    </main>
  );
}
