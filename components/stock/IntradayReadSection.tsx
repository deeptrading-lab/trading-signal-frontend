/**
 * IntradayReadSection — 종목 상세 "장중 단타 판단(참고)" 진입 + 결과. intraday-scalping-agent §0.
 *
 * 로컬 CLI 게이트(useQueryAIProviders) → on-demand 트리거(useMutationIntradayRead) → IntradayReadCard.
 * ⚠️ 의사결정 보조 — 자동 수익/집행 주장 없음, 매매는 사람이 직접.
 */

"use client";

import { useQueryAIProviders } from "@/hooks/stock/useQueryAIProviders";
import { useMutationIntradayRead } from "@/hooks/stock/useMutationIntradayRead";
import { IntradayReadCard } from "@/components/stock/IntradayReadCard";
import { INTRADAY_READ_COPY as C } from "@/lib/copy/stock/intradayRead";

export interface IntradayReadSectionProps {
  ticker: string;
  /** 카드 제목 — 워크스페이스는 종목명을 넘긴다. 미지정 시 "장중 단타 판단". */
  heading?: string;
  /** 워치 목록에서 제거(워크스페이스 전용). 미지정 시 제거 버튼 없음. */
  onRemove?: () => void;
}

export function IntradayReadSection({ ticker, heading, onRemove }: IntradayReadSectionProps) {
  const { data: providers, isLoading: gateLoading } = useQueryAIProviders();
  const read = useMutationIntradayRead();

  const provider = providers?.available[0]; // claude 우선(detectProviders 순서)
  const onRun = () => {
    if (provider) read.mutate({ ticker, provider });
  };

  return (
    <section className="card flex flex-col gap-md" aria-label={`${C.title} ${heading ?? ""}`}>
      <div className="flex items-center gap-sm">
        <h2 className="text-h2 text-text-strong">{heading ?? C.title}</h2>
        <span className="badge-info">{C.badge}</span>
        <div className="ml-auto flex items-center gap-xs">
          {read.data && !read.isPending && (
            <button type="button" onClick={onRun} className="button-secondary">
              {C.rerun}
            </button>
          )}
          {onRemove && (
            <button type="button" onClick={onRemove} className="button-secondary" aria-label="워치에서 제거">
              제거
            </button>
          )}
        </div>
      </div>

      {gateLoading ? (
        <div className="text-body text-text-muted">…</div>
      ) : !provider ? (
        <div className="text-body text-text-muted">{C.localOnly}</div>
      ) : read.isPending ? (
        <div className="flex flex-col gap-xs">
          <div className="text-body text-text-muted">{C.loading}</div>
          <div className="text-caption text-text-muted">{C.loadingHint}</div>
        </div>
      ) : read.isError ? (
        <div className="flex flex-col gap-sm">
          <div className="text-body text-signal-down">{read.error?.message ?? C.error}</div>
          <button type="button" onClick={onRun} className="button-secondary self-start">
            {C.rerun}
          </button>
        </div>
      ) : read.data ? (
        <IntradayReadCard data={read.data} />
      ) : (
        <div className="flex flex-col gap-sm">
          <p className="text-caption text-text-muted">{C.disclaimer}</p>
          <button type="button" onClick={onRun} className="button-primary self-start">
            {C.trigger}
          </button>
        </div>
      )}
    </section>
  );
}
