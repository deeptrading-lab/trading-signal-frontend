/**
 * ReanalyzeButton — 저장된 분석에서 "재분석"을 시작하는 명시 버튼(상세 시트 헤더용).
 *
 * 흐름: 버튼 클릭 → 경고 다이얼로그(ReanalyzeConfirmDialog, "기존 결과가 사라지고 교체됨") →
 *   확인 시 `openFor(ticker)` 로 우측 AI 분석 패널을 연다. 이는 종목 상세의 "AI 종합 분석" 버튼과
 *   **완전히 동일**한 진입점이라, 이후 공급자 선택(claude/codex)→분석은 기존 패널 흐름이 담당한다.
 *   분석이 끝나면(`done`) 컨텍스트가 결론/목록 캐시를 무효화해 카드가 자동 갱신된다.
 *
 * 카드(그리드 타일)에서는 우상단 케밥 메뉴(AIDecisionCardMenu)가 같은 다이얼로그를 띄운다.
 */

"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAIAnalysisContext } from "@/hooks/stock/aiAnalysisProvider";
import type { AIDecisionListItem } from "@/lib/types/stock/aiAnalysisDecisions";
import { ReanalyzeConfirmDialog } from "./ReanalyzeConfirmDialog";
import { REANALYZE_LABEL, REANALYZE_RUNNING } from "@/lib/copy/analyze/labels";

interface ReanalyzeButtonProps {
  item: AIDecisionListItem;
  /** 표시용 종목명(없으면 ticker) — 경고 문구·aria 에 사용. */
  name: string;
  /** 확인 후 호출 — 상세 시트가 자신을 닫아 패널이 가려지지 않게 할 때 사용. */
  onTriggered?: () => void;
}

export function ReanalyzeButton({ item, name, onTriggered }: ReanalyzeButtonProps) {
  const { openFor, isTickerRunning } = useAIAnalysisContext();
  const [confirming, setConfirming] = useState(false);

  const runningThis = isTickerRunning(item.ticker);

  const handleConfirm = () => {
    setConfirming(false);
    // 종목 상세 "AI 종합 분석" 버튼과 동일 — 패널만 열고 이후 흐름(공급자 선택→분석)은 패널에 위임.
    //   name 을 함께 넘겨 동시분석 탭 라벨로 캐시한다.
    openFor(item.ticker, name);
    onTriggered?.();
  };

  return (
    <>
      <button
        type="button"
        disabled={runningThis}
        onClick={(e) => {
          e.stopPropagation();
          setConfirming(true);
        }}
        aria-label={`${name} 재분석`}
        className={cn(
          "inline-flex items-center gap-xs rounded-pill border border-border-line px-md py-xs cursor-pointer",
          "text-body-sm-strong text-text-strong transition-colors hover:bg-surface-muted",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        <RefreshCw size={14} aria-hidden="true" className={cn(runningThis && "animate-spin")} />
        {runningThis ? REANALYZE_RUNNING : REANALYZE_LABEL}
      </button>

      {confirming && (
        <ReanalyzeConfirmDialog
          name={name}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
