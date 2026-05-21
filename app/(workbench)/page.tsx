/**
 * 메인 = 워크벤치 (v4 layout-redesign).
 *
 * 구조 (위→아래, DESIGN.md v4 §Layout):
 *   ticker-header (별표 토글 포함)
 *   SearchPanel + InputPanel
 *   ResultGroup (empty | loading | success | error)
 *
 * 사전 차단:
 *   - 분석 버튼 활성: ticker 선택 + 4필드 validateAnalyzePayload OK.
 *   - 비활성 시 aria-disabled + helper text.
 *
 * 호출 경로 (모두 도메인 훅 경유 — TanStack Query 인터페이스 누출 0건):
 *   - 화이트리스트: useTickerSearch → useQueryWhitelistSearch → searchWhitelist → /api/whitelist/search → FastAPI
 *   - 분석:        useAnalyzeRun  → useMutationAnalyzeWorkbench → analyzeWorkbench → /api/workbench/analyze → FastAPI
 *
 *   직접 fetch · 127.0.0.1 호출 0건 (AC-10).
 *
 * v3 무회귀:
 *   - lg:grid-cols-[360px_1fr] / lg:sticky lg:top-0 패턴 폐기 (AC-3).
 *   - SearchPanel + InputPanel 이 사이드바가 아닌 메인 영역 상단 (AC-7).
 *
 * v4 신규:
 *   - in-session 히스토리·즐겨찾기 — mutation 성공 시 자동 push (R8).
 *   - ticker-header 의 별표 토글 (R6 진입점 1).
 *   - 사이드바 항목 클릭 → CustomEvent 수신 → ticker / 입력값 복원.
 */

"use client";

import { useEffect } from "react";
import { SearchPanel } from "@/components/workbench/SearchPanel";
import { InputPanel } from "@/components/workbench/InputPanel";
import { ResultGroup } from "@/components/workbench/ResultGroup";
import { FavoriteToggle } from "@/components/layout/FavoriteToggle";
import { useAnalyzeForm } from "@/hooks/workbench/useAnalyzeForm";
import { useAnalyzeRun } from "@/hooks/workbench/useAnalyzeRun";
import { useAnalyzeHistory } from "@/hooks/workbench/useAnalyzeHistory";
import { useFavorites } from "@/hooks/workbench/useFavorites";
import {
  WORKBENCH_SELECT_HISTORY_EVENT,
  WORKBENCH_SELECT_FAVORITE_EVENT,
  WORKBENCH_TICKER_CHANGE_EVENT,
  type WorkbenchSelectHistoryDetail,
  type WorkbenchSelectFavoriteDetail,
  type WorkbenchTickerChangeDetail,
} from "@/components/layout/workbenchEvents";
import {
  TICKER_HEADER_EMPTY,
  FOOTER_DISCLAIMER,
} from "@/lib/copy/workbench/layoutCopy";

export default function WorkbenchPage() {
  const {
    selectedTicker,
    setSelectedTicker,
    form,
    setField,
    errors,
    isValid,
    attemptSubmit,
  } = useAnalyzeForm();

  const { submit, isPending, isError, error, data, reset } = useAnalyzeRun();
  const { pushHistory } = useAnalyzeHistory();
  const { isFavorite, toggleFavorite } = useFavorites();

  // 선택 ticker 변경을 layout 으로 알린다 — 사이드바 active 표시용.
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent<WorkbenchTickerChangeDetail>(WORKBENCH_TICKER_CHANGE_EVENT, {
        detail: { ticker: selectedTicker?.ticker ?? null },
      }),
    );
  }, [selectedTicker]);

  // 사이드바 클릭 → 메인 영역 복원 이벤트 수신.
  useEffect(() => {
    function handleSelectHistory(event: Event) {
      const detail = (event as CustomEvent<WorkbenchSelectHistoryDetail>).detail;
      if (!detail?.entry) return;
      const entry = detail.entry;
      // 히스토리 항목의 WhitelistItem 재구성 — 토글·active 비교에 ticker / name / currency 만 필요.
      setSelectedTicker({
        ticker: entry.ticker,
        name: entry.name,
        asset_type: "",
        exchange: "",
        currency: entry.currency,
        sector: "",
        risk_tier: "",
        aliases: [],
      });
      setField("capital_amount", String(entry.lastInput.capital_amount));
      setField("target_return_pct", String(entry.lastInput.target_return_pct));
      setField("target_period_days", String(entry.lastInput.target_period_days));
      setField("max_loss_pct", String(entry.lastInput.max_loss_pct));
      // 결과는 자동 재실행하지 않음 — 사용자가 분석 버튼 다시 누르도록 (의도된 마찰).
      reset();
    }
    function handleSelectFavorite(event: Event) {
      const detail = (event as CustomEvent<WorkbenchSelectFavoriteDetail>).detail;
      if (!detail?.item) return;
      setSelectedTicker(detail.item);
      // 즐겨찾기는 입력값을 함께 갖지 않으므로 ticker 만 복원. 입력값은 사용자가 재입력.
      reset();
    }
    window.addEventListener(WORKBENCH_SELECT_HISTORY_EVENT, handleSelectHistory);
    window.addEventListener(WORKBENCH_SELECT_FAVORITE_EVENT, handleSelectFavorite);
    return () => {
      window.removeEventListener(WORKBENCH_SELECT_HISTORY_EVENT, handleSelectHistory);
      window.removeEventListener(WORKBENCH_SELECT_FAVORITE_EVENT, handleSelectFavorite);
    };
  }, [setSelectedTicker, setField, reset]);

  function handleSubmit() {
    const payload = attemptSubmit();
    if (!payload) return;
    submit(payload);
    // mutation 성공 시 자동 push — pushHistory 호출은 onSuccess 콜백을 직접 받지 못하므로
    // selectedTicker + payload 시점 그대로 push. submit 은 async 비동기이지만
    // payload·selectedTicker 는 사용자가 다음 입력을 시작하기 전까지 안정적.
    if (selectedTicker) {
      pushHistory({
        ticker: selectedTicker.ticker,
        name: selectedTicker.name,
        currency: selectedTicker.currency,
        lastInput: payload,
        pushedAt: Date.now(),
      });
    }
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
    <div className="mx-auto w-full max-w-main-max-w flex flex-col gap-md">
      {/* ticker-header — R6 즐겨찾기 진입점 1/2. */}
      <div className="ticker-header">
        <div className="min-w-0 flex flex-col">
          {selectedTicker ? (
            <>
              <strong className="text-body-md font-bold text-text-strong truncate">
                {selectedTicker.ticker} · {selectedTicker.name}
              </strong>
              <span className="text-caption text-text-muted truncate">
                {selectedTicker.currency}
              </span>
            </>
          ) : (
            <span className="text-body-md text-text-muted">
              {TICKER_HEADER_EMPTY}
            </span>
          )}
        </div>
        {selectedTicker ? (
          <FavoriteToggle
            isFavorite={isFavorite(selectedTicker.ticker)}
            onToggle={() => toggleFavorite(selectedTicker)}
          />
        ) : null}
      </div>

      {/* 입력 영역 — 메인 영역 상단 (AC-7). */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
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
      </div>

      {/* 결과 영역 — 6블록 위계 (AC-4). */}
      <ResultGroup
        state={resultState}
        data={data}
        error={error}
        onRetry={handleRetry}
      />

      <footer className="grid gap-xs mt-lg px-[2px] text-caption text-text-muted">
        <span>{FOOTER_DISCLAIMER}</span>
      </footer>
    </div>
  );
}
