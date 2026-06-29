"use client";

/**
 * prod(Vercel) 배포 주소 한정 — AI 종합분석 "요청 접수" 카드(DESIGN.md S1~S6, S9).
 *
 * prod 에는 분석 CLI 가 없어 직접 실행할 수 없다(route handler 503). 대신 enqueue 로 Supabase 큐에
 * 요청을 적재하고, 로컬 워커가 처리해 저장한 결과를 "재방문"으로 확인하는 비동기 모델이다.
 * 따라서 실시간 진행 스트림·SlideToAnalyze 슬라이드를 그리지 않는다(prod 무회귀 — 로컬 전용).
 *
 * 상태 머신(useProdAnalysisRequest.phase):
 *   - idle       : 이전 결론 신선도에 따라 재요청/첫요청 CTA(또는 신선하면 CTA 숨김 — S1).
 *   - requesting : 요청 보내는 중(버튼 disabled + 스피너).
 *   - accepted/offline/duplicate/error : 상단 상태 배너(S4/S5/S6/실패). 이전 결론 카드는 아래 유지.
 *
 * 배치(DESIGN.md Layout): [상태 배너] → [재요청 안내 / 빈 인트로] → [FinalVerdictCard].
 * 색·간격은 신규 토큰 0 — .card-info/.card-warn/.card-critical + accent-vivid 재사용.
 *
 * ⚠️ 이 컴포넌트는 prod 분기에서만 마운트된다(AIAnalysisPanel). 로컬은 기존 라이브 경로 그대로.
 */

import { cn } from "@/lib/utils/cn";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import { REANALYSIS_PROMPT_MIN_AGE_MS } from "@/hooks/stock/aiAnalysisProvider";
import {
  useProdAnalysisRequest,
  type ProdRequestPhase,
} from "@/hooks/stock/useProdAnalysisRequest";
import { useConfidenceCalibration } from "@/hooks/scorecard/useConfidenceCalibration";
import { FinalVerdictCard } from "./FinalVerdictCard";
import { ProdQueueBanner, type ProdQueueBannerTone } from "./ProdQueueBanner";
import { ProdRequestCta } from "./ProdRequestCta";
import { WorkerActivityBadge } from "./WorkerActivityBadge";
import type {
  AIAnalysisDecisionSnapshot,
  AIAnalysisProvider,
} from "@/lib/types/stock/aiAnalysis";

interface ProdAnalysisQueueCardProps {
  ticker: string;
  /** 저장된 이전 결론(없으면 S3 빈 인트로). */
  snapshot: AIAnalysisDecisionSnapshot | null;
  /** 이 종목이 분석 큐에서 진행 중(pending/processing)이면 — "분석 중" 선제 표시 + 요청 CTA 숨김. */
  activeJob?: { status: "pending" | "processing" } | null;
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** 마지막 분석이 30분 이내면 신선(S1) — 재요청 CTA 숨김. 로컬 재분석 프롬프트와 동일 임계. */
function isFresh(updatedAt: string): boolean {
  const t = new Date(updatedAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < REANALYSIS_PROMPT_MIN_AGE_MS;
}

/** phase → 상태 배너 톤·카피. idle/requesting 은 배너 없음(null). */
function bannerOf(
  phase: ProdRequestPhase,
): { tone: ProdQueueBannerTone; title: string; desc: string } | null {
  switch (phase) {
    case "accepted":
      return {
        tone: "info",
        title: COPY.prodQueue.acceptedTitle,
        desc: COPY.prodQueue.acceptedDesc,
      };
    case "offline":
      return {
        tone: "warn",
        title: COPY.prodQueue.offlineTitle,
        desc: COPY.prodQueue.offlineDesc,
      };
    case "duplicate":
      return {
        tone: "duplicate",
        title: COPY.prodQueue.duplicateTitle,
        desc: COPY.prodQueue.duplicateDesc,
      };
    case "error":
      return {
        tone: "critical",
        title: COPY.prodQueue.enqueueErrorTitle,
        desc: COPY.prodQueue.enqueueErrorDesc,
      };
    default:
      return null;
  }
}

/** 이전 결론 메타 한 줄(날짜 · provider). */
function PreviousMeta({
  updatedAt,
  provider,
}: {
  updatedAt: string;
  provider: AIAnalysisProvider;
}) {
  return (
    <p className="text-caption text-text-muted break-keep">
      {COPY.previousDecision.meta(
        formatUpdatedAt(updatedAt),
        COPY.provider[provider],
      )}
    </p>
  );
}

export function ProdAnalysisQueueCard({
  ticker,
  snapshot,
  activeJob = null,
}: ProdAnalysisQueueCardProps) {
  const request = useProdAnalysisRequest(ticker);
  const { getCalibration, minSampleN } = useConfidenceCalibration();

  const banner = bannerOf(request.phase);
  // 이 종목이 이미 큐에서 진행 중이면 "분석 중/대기 중" 선제 표시(요청 CTA 대신). 방금 제출해 배너가
  // 떠 있으면(banner) 그쪽 우선 — 중복 표시 방지. 완료되면 폴링이 active=null 로 떨궈 결과 카드로 전환.
  const activeBanner =
    activeJob && !banner
      ? {
          tone: "duplicate" as const,
          title:
            activeJob.status === "processing"
              ? COPY.prodQueue.activeProcessingTitle
              : COPY.prodQueue.activePendingTitle,
          desc: COPY.prodQueue.duplicateDesc,
        }
      : null;
  const shownBanner = banner ?? activeBanner;
  // 요청을 보냈거나(배너) 이미 진행 중(activeJob)이면 재요청/첫요청 CTA 는 숨긴다 — 중복 요청 혼란 제거.
  const requested =
    banner != null || request.phase === "requesting" || activeJob != null;
  const fresh = snapshot ? isFresh(snapshot.updatedAt) : false;
  // 실패(error) 배너에는 "다시 요청" CTA 를 함께(S9 톤 — enqueue 자체 실패 재시도).
  const errorRetryCta =
    request.phase === "error" ? (
      <ProdRequestCta
        label={COPY.prodQueue.retry}
        isPending={request.isPending}
        onClick={() => request.submit()}
      />
    ) : undefined;

  return (
    <div className="w-full space-y-3">
      {/* 워커 활동 뱃지(S7) — 처리 중/대기/오프라인. 이 종목이 active 면 아래 배너가 "분석 중"을
          더 구체적으로 말하므로 전역 뱃지는 숨겨 중복 방지(요청 전 오프라인 경고용으론 유지). */}
      {!activeJob && <WorkerActivityBadge />}

      {/* 상태 배너(S4/S5/S6/실패/진행 중) — 최상단. role=status + aria-live 로 전이 알림. */}
      {shownBanner && (
        <ProdQueueBanner
          tone={shownBanner.tone}
          title={shownBanner.title}
          desc={shownBanner.desc}
          action={errorRetryCta}
        />
      )}

      {snapshot ? (
        <>
          {/* S2: 신선도 낮은 이전 결론 — 재요청 안내 박스(아직 요청 안 했을 때만). S1(신선): CTA 숨김. */}
          {!requested && !fresh && (
            <div className="w-full rounded-lg border border-border-line bg-surface-muted p-card-px-mobile">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-body-sm-strong text-text-strong break-keep">
                    {COPY.prodQueue.staleTitle}
                  </p>
                  <div className="mt-1">
                    <PreviousMeta
                      updatedAt={snapshot.updatedAt}
                      provider={snapshot.provider}
                    />
                  </div>
                </div>
                <div className="w-full shrink-0 sm:w-auto">
                  <ProdRequestCta
                    label={COPY.prodQueue.request}
                    isPending={request.isPending}
                    onClick={() => request.submit({ force: true })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* S1: 신선하면 메타만 곁들이고 CTA 숨김(결과 소비). */}
          {!requested && fresh && (
            <div className="w-full px-1">
              <PreviousMeta
                updatedAt={snapshot.updatedAt}
                provider={snapshot.provider}
              />
            </div>
          )}

          {/* 이전 결론 — 기존 FinalVerdictCard 재사용(신규 결과 UI 0). */}
          <FinalVerdictCard
            data={snapshot.decision}
            calibration={getCalibration(snapshot.decision.confidence)}
            calibrationMinSampleN={minSampleN}
          />
        </>
      ) : (
        // S3: 이전 결과 없음 — 빈 인트로 + 첫 요청 CTA(아직 요청 안 했을 때만).
        !requested && (
          <div
            className={cn(
              "w-full rounded-lg bg-surface-muted p-card-px-mobile text-center",
              "flex flex-col items-center gap-3",
            )}
          >
            <div>
              <p className="text-body-sm-strong text-text-strong break-keep">
                {COPY.prodQueue.emptyTitle}
              </p>
              <p className="mt-1 text-body-sm text-text-muted leading-relaxed break-keep">
                {COPY.prodQueue.emptyDesc}
              </p>
            </div>
            {/* 모바일 풀폭(터치 타깃) · 데스크탑 자동폭(중앙) — 기본 동작 그대로. */}
            <ProdRequestCta
              label={COPY.prodQueue.request}
              isPending={request.isPending}
              onClick={() => request.submit()}
            />
          </div>
        )
      )}
    </div>
  );
}
