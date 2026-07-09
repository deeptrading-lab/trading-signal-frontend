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

import { RefreshCw } from "lucide-react";
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
            {/* 노스스타 `.sb-ic` — 앰버 채움 원 + 흰 "!"(경고 아이콘). */}
            <span
              className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-warn text-caption font-extrabold text-surface"
              aria-hidden="true"
            >
              !
            </span>
            <p className="text-body-sm font-medium leading-relaxed break-keep">
              {COPY.savedMode.staleBanner(
                reason,
                livePrice != null ? formatNumber(livePrice) : null,
                formatRelativeTime(snapshot.updatedAt),
              )}
            </p>
          </div>
          {/* 노스스타 `.sb-b` — 앰버 채움 pill 버튼. */}
          <button
            type="button"
            onClick={onReanalyze}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-pill bg-warn px-lg py-1.5 text-caption font-bold text-surface transition hover:brightness-110 cursor-pointer"
          >
            <RefreshCw size={13} aria-hidden="true" /> {COPY.savedMode.staleCta}
          </button>
        </div>
      )}

      {/* 노스스타 `.fv-stack` — 히어로(글랜스) + 상세(플랫 스택). stale 이면 **히어로만** opacity .66 으로
          낮춰(`#saved-body[data-state="stale"] #saved-verdict{opacity:.66}`) "이전 분석"을 전달하고,
          상세(근거·전략)는 가독성을 위해 풀 opacity 로 유지한다. */}
      <div className="space-y-3">
        <div className={cn("transition-opacity", stale && "opacity-[.66]")}>
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
        </div>
        <VerdictDetails data={snapshot.decision} />
      </div>

      {/* valid(신선) — 하단 subtle 재분석 행. 일반 사용자엔 "AI 분석" 총칭(엔진/모델은 아래 관리자 전용 캡션). */}
      {!stale && (
        <div className="mt-lg flex items-center justify-between gap-3 border-t border-border-line pt-md">
          <p className="text-caption text-text-muted">
            {COPY.savedMode.validFooter(formatRelativeTime(snapshot.updatedAt))}
          </p>
          {/* 노스스타 `.sf-btn` — accent 아웃라인 pill(accent-soft 배경·accent 텍스트, hover 시 채움). */}
          <button
            type="button"
            onClick={onReanalyze}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-pill border border-accent-vivid bg-accent-vivid-soft px-lg py-1.5 text-caption font-bold text-accent-vivid transition-colors hover:bg-accent-vivid hover:text-surface cursor-pointer"
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
