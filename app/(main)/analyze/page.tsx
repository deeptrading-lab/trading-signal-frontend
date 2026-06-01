/**
 * `/analyze` — AI 분석 워크벤치 (v4 layout-redesign + finsight-redesign PR5).
 *
 * PR5 (finsight-redesign): 라우트 이전 `/` → `/analyze`.
 *   - 사이드바 / BottomNav 의 "AI 분석 워크벤치" 메뉴(`/analyze`) 가 본 페이지를 활성화.
 *   - 워크벤치 컴포넌트·훅·API 도메인 폴더명(`workbench`) 유지 (PRD §9 q5 RESOLVED 옵션 A).
 *   - 워크벤치 도메인 부속 파일 `FavoriteToggle.tsx` 를 `components/workbench/` 로 동반 이전.
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
 *
 * 참고: finsight-redesign 에서 사이드바 히스토리/즐겨찾기 목록이 제거되며
 * `WORKBENCH_*_EVENT` CustomEvent 버스(목록 클릭 → 본 페이지 복원)의 producer 가
 * 사라졌다. 남아 있던 dispatch/listener 는 dead code 라 제거(2026-06-01, P2).
 * history/favorites 목록 UI 가 재도입되면 zustand store 로 새로 설계한다.
 */

"use client";

import { SearchPanel } from "@/components/workbench/SearchPanel";
import { InputPanel } from "@/components/workbench/InputPanel";
import { ResultGroup } from "@/components/workbench/ResultGroup";
import { FavoriteToggle } from "@/components/workbench/FavoriteToggle";
import { useAnalyzeForm } from "@/hooks/workbench/useAnalyzeForm";
import { useAnalyzeRun } from "@/hooks/workbench/useAnalyzeRun";
import { useAnalyzeHistory } from "@/hooks/workbench/useAnalyzeHistory";
import { useFavorites } from "@/hooks/workbench/useFavorites";
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

  function handleSubmit() {
    const payload = attemptSubmit();
    if (!payload) return;
    // v5 (component-compactness) PRD §3.5.2 / AC-7 — pushHistory 시점 정밀화.
    //   - mutation 성공이 확정된 onSuccess 콜백 안에서만 push (실패 시 push 안 함).
    //   - 한 분석 결과 당 정확히 1회 발화 (mutation onSuccess 가 1회만 발화).
    //   - 동일 ticker 중복 push 는 `useWorkbenchSession.pushHistory` 가 LRU promote 처리.
    //   - selectedTicker 는 클로저 캡처 — submit 직후 사용자가 다른 ticker 로 바꾸는 동안
    //     성공 콜백이 들어와도 "분석 시점의 ticker" 로 push 되어야 일관.
    const tickerAtSubmit = selectedTicker;
    submit(payload, {
      onSuccess: (committedPayload) => {
        if (!tickerAtSubmit) return;
        pushHistory({
          ticker: tickerAtSubmit.ticker,
          name: tickerAtSubmit.name,
          currency: tickerAtSubmit.currency,
          lastInput: committedPayload,
          pushedAt: Date.now(),
        });
      },
    });
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

      <footer className="grid gap-xs mt-lg px-xs text-caption text-text-muted">
        <span>{FOOTER_DISCLAIMER}</span>
      </footer>
    </div>
  );
}
