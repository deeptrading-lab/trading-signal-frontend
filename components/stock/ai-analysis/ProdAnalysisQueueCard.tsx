"use client";

/**
 * prod(Vercel) 배포 주소 한정 — AI 종합분석 "요청 접수" 카드(DESIGN.md S1~S6, S9).
 *
 * prod 에는 분석 CLI 가 없어 직접 실행할 수 없다(route handler 503). 대신 enqueue 로 Supabase 큐에
 * 요청을 적재하고, 로컬 워커가 처리해 저장한 결과를 "재방문"으로 확인하는 비동기 모델이다.
 * 따라서 실시간 진행 스트림·라이브 재분석 컨트롤을 그리지 않는다(prod 무회귀 — 로컬 전용).
 *
 * 상태 머신(useProdAnalysisRequest.phase):
 *   - idle       : 저장 결론 staleness 에 따라 배치 — 만료=상단 앰버 배너, 유효=하단 subtle 푸터.
 *   - requesting : 요청 보내는 중(버튼 disabled + 스피너).
 *   - accepted/offline/duplicate/error : 상단 상태 배너(S4/S5/S6/실패). 이전 결론 카드는 아래 유지.
 *
 * 배치(로컬 SavedDecisionView 미러): [상태 배너] → [만료 앰버 배너?] → [VerdictHero(stale 딤)+VerdictDetails]
 *   → [유효 subtle 푸터?]. staleness 는 로컬과 동일 evaluateDecisionStaleness(3영업일+가격규칙)로 판정해
 *   같은 2일짜리가 prod/로컬에서 갈리지 않게 통일한다. 색·간격은 신규 토큰 0 —
 *   .card-info/.card-warn/.card-critical + accent-vivid + bg-warn 재사용.
 *
 * ⚠️ 이 컴포넌트는 prod 분기에서만 마운트된다(AIAnalysisPanel). 로컬은 기존 라이브 경로 그대로.
 */

import { RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatMoney";
import { formatRelativeTime } from "@/lib/utils/formatRelativeTime";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import { evaluateDecisionStaleness } from "@/lib/stock/decisionStaleness";
import {
  useProdAnalysisRequest,
  type ProdRequestPhase,
} from "@/hooks/stock/useProdAnalysisRequest";
import { useConfidenceCalibration } from "@/hooks/scorecard/useConfidenceCalibration";
import { useMe } from "@/hooks/auth/useMe";
import { VerdictHero } from "./VerdictHero";
import { VerdictDetails } from "./VerdictDetails";
import { ProdQueueBanner, type ProdQueueBannerTone } from "./ProdQueueBanner";
import { ProdRequestCta } from "./ProdRequestCta";
import { WorkerActivityBadge } from "./WorkerActivityBadge";
import type { AIAnalysisDecisionSnapshot } from "@/lib/types/stock/aiAnalysis";

interface ProdAnalysisQueueCardProps {
  ticker: string;
  /** 현재 해석된 종목명(decision-stock-name) — 요청 시 큐 행에 함께 적재해 대기중 카드도 즉시 종목명 표시. */
  name?: string | null;
  /** 저장된 이전 결론(없으면 S3 빈 인트로). */
  snapshot: AIAnalysisDecisionSnapshot | null;
  /** 라이브 현재가(원) — staleness 평가·만료 배너 표기용. 로딩 전이면 null(가격 규칙 건너뜀). */
  livePrice?: number | null;
  /** 이 종목이 분석 큐에서 진행 중(pending/processing)이면 — "분석 중" 선제 표시 + 요청 CTA 숨김. */
  activeJob?: { status: "pending" | "processing" } | null;
}

/**
 * 만료 배너·유효 푸터용 compact pill 요청 버튼 — 로컬 SavedDecisionView 의 stale/valid pill 미러.
 * variant: warn(만료 앰버 채움) | accent(유효 accent 아웃라인). isPending 이면 스피너 + disabled.
 * (S3 빈 인트로·error retry 는 큰 ProdRequestCta 유지 — compact 는 이미 결론이 떠 있는 곳 전용.)
 */
function RequestPill({
  variant,
  isPending,
  onClick,
}: {
  variant: "warn" | "accent";
  isPending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      aria-disabled={isPending || undefined}
      aria-busy={isPending || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-pill px-lg py-1.5 text-caption font-bold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-80",
        variant === "warn"
          ? "bg-warn text-surface hover:brightness-110"
          : "border border-accent-vivid bg-accent-vivid-soft text-accent-vivid hover:bg-accent-vivid hover:text-surface",
      )}
    >
      {isPending ? (
        <Loader2
          size={13}
          className="animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
      ) : (
        <RefreshCw size={13} aria-hidden="true" />
      )}
      {isPending ? COPY.prodQueue.requesting : COPY.prodQueue.request}
    </button>
  );
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

export function ProdAnalysisQueueCard({
  ticker,
  name,
  snapshot,
  livePrice = null,
  activeJob = null,
}: ProdAnalysisQueueCardProps) {
  // 종목명 우선순위: 현재 해석명(prop) → 이전 결론 저장명(snapshot). 서버가 pickStockName 으로 재정제.
  const request = useProdAnalysisRequest(ticker, name ?? snapshot?.name ?? null);
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
  // 미로그인은 분석을 요청할 수 없다(서버도 enqueue 401) — CTA 를 아예 안 그린다.
  // 저장된 결과 열람은 그대로(데모 종목). 로딩 중에도 false = 안전 실패(권한 UI 선례).
  const { authenticated } = useMe();

  // 요청을 보냈거나(배너) 이미 진행 중(activeJob)이면 재요청/첫요청 CTA 는 숨긴다 — 중복 요청 혼란 제거.
  // 미로그인(!authenticated)도 같은 스위치로 한 번에 숨긴다(CTA 3곳 공통 게이트).
  const requested =
    banner != null ||
    request.phase === "requesting" ||
    activeJob != null ||
    !authenticated;
  // 로컬 SavedDecisionView 와 동일 staleness(3영업일+가격규칙) — 만료=상단 배너, 유효=하단 푸터로 갈린다.
  const staleness = snapshot
    ? evaluateDecisionStaleness({
        decision: snapshot.decision,
        livePrice,
        updatedAt: snapshot.updatedAt,
      })
    : null;
  const stale = staleness?.stale ?? false;
  const staleReason = staleness?.reason ?? null;
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
      {/* 워커 활동 뱃지(S7) — 상태 배너가 없을 때만 단독으로(요청 전 오프라인 경고용).
          상태 배너가 있으면 아래에서 제목 왼쪽 leading 으로 넣는다(한 묶음으로 보이게). */}
      {!shownBanner && <WorkerActivityBadge />}

      {/* 상태 배너(S4/S5/S6/실패/진행 중) — role=status + aria-live 로 전이 알림.
          상태 배너(접수/오프라인/중복/실패)엔 워커 뱃지를 제목 왼쪽에. 진행 중(activeBanner)은
          배너 자체가 "분석 중"을 말하므로 뱃지 생략(중복 방지). */}
      {shownBanner && (
        <ProdQueueBanner
          tone={shownBanner.tone}
          title={shownBanner.title}
          desc={shownBanner.desc}
          action={errorRetryCta}
          leading={banner ? <WorkerActivityBadge /> : undefined}
        />
      )}

      {/* 미로그인 — CTA 대신 이유를 한 줄로. 결과(저장 카드)는 아래에 그대로 보인다. */}
      {!authenticated && !shownBanner && (
        <div
          role="status"
          className="rounded-lg bg-surface-muted p-card-px-mobile text-center"
        >
          <p className="text-body-sm-strong text-text-strong break-keep">
            {COPY.prodQueue.loginRequiredTitle}
          </p>
          <p className="mt-1 text-body-sm text-text-muted leading-relaxed break-keep">
            {COPY.prodQueue.loginRequiredDesc}
          </p>
        </div>
      )}

      {snapshot ? (
        <>
          {/* 만료(stale) — 상단 앰버 배너 + compact 재요청 pill(로컬 SavedDecisionView 미러).
              요청중/진행중(requested)이면 숨긴다(중복 요청 방지 — 기존 동작 보존). */}
          {stale && staleReason && !requested && (
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
                    staleReason,
                    livePrice != null ? formatNumber(livePrice) : null,
                  )}
                </p>
              </div>
              <RequestPill
                variant="warn"
                isPending={request.isPending}
                onClick={() => request.submit({ force: true })}
              />
            </div>
          )}

          {/* 노스스타 `.fv-stack` — 히어로(글랜스, stale 이면 opacity .66 딤 "이전 분석") + 상세(플랫 스택).
              상세는 가독성을 위해 풀 opacity 유지. 로컬 SavedDecisionView 와 동일 구조. */}
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

          {/* 유효(신선) — 하단 subtle 재분석 푸터 + compact 재요청 pill(로컬 valid 푸터 미러).
              요청중/진행중(requested)이면 숨긴다(중복 요청 방지 — 기존 동작 보존). */}
          {!stale && !requested && (
            <div className="mt-lg flex items-center justify-between gap-3 border-t border-border-line pt-md">
              <p className="text-caption text-text-muted">
                {COPY.savedMode.validFooter(
                  formatRelativeTime(snapshot.updatedAt),
                )}
              </p>
              <RequestPill
                variant="accent"
                isPending={request.isPending}
                onClick={() => request.submit()}
              />
            </div>
          )}
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
