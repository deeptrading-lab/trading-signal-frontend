"use client";

/**
 * SavedDecisionView — 우측 패널 "저장모드"(ai-analysis-redesign PR③).
 *
 * /analyze 저장 결론 클릭·종목 상세 재열기 등으로 패널이 저장 스냅샷을 열 때(로컬, 슬롯 all-pending)의 뷰.
 * 과정(분석가/토론/리스크 대화)은 **저장되지 않으므로**(verdict-only) 회색 12-칩·페이즈 노드를 그리지 않고,
 * 저장된 FinalDecision 전체를 verdict-forward 로 보여준다(노스스타 `.fv-stack`):
 *   - VerdictHero(mode="saved") — 판정 라벨·신호강도·목표/손절/손익비·기간·분석 시점가(글랜스).
 *   - VerdictDetails — 근거·집행 가이드·전망·강점/리스크(플랫 상세 스택).
 *   - staleness(decisionStaleness): 분석 시점가(base_price) 대비 라이브 현재가가 목표/손절/큰이동/오래됨이면
 *     **상단 앰버 배너 + [지금 기준 재분석]** 로 재분석 권유 + verdict 살짝 낮춤(이전 분석). 유효하면 배너 없이
 *     **하단 subtle 재분석 행**.
 *
 * ⚠️ SNS 감정 배지·토큰/비용 요약은 노출하지 않는다 — verdict-forward·오해 방지.
 *    provider(엔진)/모델명은 **일반 사용자에겐 미노출**("AI 분석" 총칭)하되, **관리자에게만** 하단 subtle
 *    캡션으로 표기한다(user-login-auth Phase 2 — `useMe().isAdmin`). 재분석 액션은 상위(패널)의 공급자
 *    선택(ProviderChooser→start) 경로로 위임한다. prod(enqueue) 저장모드는 ProdAnalysisQueueCard 담당.
 */

import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatMoney";
import { formatRelativeTime } from "@/lib/utils/formatRelativeTime";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import { useConfidenceCalibration } from "@/hooks/scorecard/useConfidenceCalibration";
import { useMe } from "@/hooks/auth/useMe";
import { evaluateDecisionStaleness } from "@/lib/stock/decisionStaleness";
import { VerdictHero } from "./VerdictHero";
import { VerdictDetails } from "./VerdictDetails";
import type { AIAnalysisDecisionSnapshot } from "@/lib/types/stock/aiAnalysis";

interface SavedDecisionViewProps {
  snapshot: AIAnalysisDecisionSnapshot;
  /** 라이브 현재가(원) — staleness 평가·배너 표기용. 로딩 전이면 null(가격 규칙 건너뜀). */
  livePrice: number | null;
  /** 재분석 — 공급자 선택 화면으로(기존 start 경로). stale/valid 버튼 공용. */
  onReanalyze: () => void;
}

export function SavedDecisionView({ snapshot, livePrice, onReanalyze }: SavedDecisionViewProps) {
  // 보정된 신뢰도(scorecard-feedback (가)) — 저장 카드에도 곁들인다(표시 전용·무회귀).
  const { getCalibration, minSampleN } = useConfidenceCalibration();
  // 관리자에게만 분석 엔진/모델을 노출(user-login-auth Phase 2). 로딩·미인증·일반유저는 isAdmin=false.
  const { isAdmin } = useMe();
  const { stale, reason } = evaluateDecisionStaleness({
    decision: snapshot.decision,
    livePrice,
    updatedAt: snapshot.updatedAt,
  });

  return (
    // 라이브 뷰와 동일하게 패널 폭을 꽉 채운다. 배치: [앰버 배너?] → 히어로 → 상세 → [하단 재분석 행?].
    <div className="w-full space-y-3">
      {/* stale — 상단 앰버 배너 + 지금 기준 재분석. role=status 로 전이 알림. */}
      {stale && reason && (
        <div
          role="status"
          aria-live="polite"
          aria-label={COPY.savedMode.staleAria}
          className="card-warn flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-body-sm font-medium leading-relaxed break-keep">
              {COPY.savedMode.staleBanner(
                reason,
                livePrice != null ? formatNumber(livePrice) : null,
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onReanalyze}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-sm bg-warn px-md py-1.5 text-caption font-bold text-surface transition hover:brightness-110 cursor-pointer"
          >
            <RefreshCw size={13} aria-hidden="true" /> {COPY.savedMode.staleCta}
          </button>
        </div>
      )}

      {/* 노스스타 `.fv-stack` — 히어로(글랜스) + 상세(플랫 스택). stale 이면 살짝 낮춰 "이전 분석" 전달. */}
      <div className={cn("space-y-3 transition-opacity", stale && "opacity-90")}>
        <VerdictHero
          final={snapshot.decision}
          signal={snapshot.signal}
          doneCount={0}
          totalCount={0}
          mode="saved"
          stale={stale}
          calibration={getCalibration(snapshot.decision.confidence)}
          calibrationMinSampleN={minSampleN}
        />
        <VerdictDetails data={snapshot.decision} />
      </div>

      {/* valid(신선) — 하단 subtle 재분석 행. 일반 사용자엔 "AI 분석" 총칭(엔진/모델은 아래 관리자 전용 캡션). */}
      {!stale && (
        <div className="flex items-center justify-between gap-3 px-1 pt-1">
          <p className="text-caption text-text-muted">
            {COPY.savedMode.validFooter(formatRelativeTime(snapshot.updatedAt))}
          </p>
          <button
            type="button"
            onClick={onReanalyze}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-surface-muted px-md py-1.5 text-caption font-medium text-text-muted transition-colors hover:bg-border-line cursor-pointer"
          >
            <RefreshCw size={13} aria-hidden="true" /> {COPY.savedMode.reanalyze}
          </button>
        </div>
      )}

      {/* 관리자 전용 — 분석 엔진/모델(일반 사용자 미노출). stale/valid 무관 하단 subtle 캡션. */}
      {isAdmin && (
        <p className="px-1 text-caption text-text-muted">
          {COPY.savedMode.adminEngine(snapshot.provider, snapshot.decision.model)}
        </p>
      )}
    </div>
  );
}
