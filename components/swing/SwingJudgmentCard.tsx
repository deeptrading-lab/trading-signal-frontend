/**
 * SwingJudgmentCard — 종목 상세 "스윙 체크" 카드(PRD `swing-judgment` PR-3, 디자인 swing-ui 표면 B).
 *
 * 국내 종목에서 기존 4축 시그널 요약 자리를 대체한다(미국 종목은 StockPageLayout 이 기존 요약 유지).
 * 순서: 제목·기준일·충족 n/7 → 주의 사유(있을 때만, 실측값+기준값+과거 통계) → 조건 체크리스트
 * → 참고 지지·저항·2주 통상 변동폭 → 과거 통계 → 면책. 판정은 서버가 규칙서로 계산한 값을 그대로 쓴다.
 */

"use client";

import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useQuerySwingJudgment } from "@/hooks/swing/useQuerySwingJudgment";
import { metCount } from "@/lib/swing/itemBits";
import type { SwingJudgment } from "@/lib/swing/judge";
import { RULEBOOK } from "@/lib/swing/rulebook";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatMoney";
import { roundToKrxTick } from "@/lib/utils/krxTick";
import type { SwingJudgmentResponse } from "@/lib/types/swing/api";
import {
  SWING_CARD_HELP,
  SWING_CARD_TITLE,
  SWING_CAUTION_TITLE,
  SWING_CHECK_MISS,
  SWING_CHECK_MISS_SR,
  SWING_CHECK_PASS,
  SWING_CHECK_ROWS,
  SWING_CHECK_UNKNOWN,
  SWING_DISCLAIMER,
  SWING_GRADE_COHORT_LABEL,
  SWING_ITEM_LABEL,
  SWING_LEVEL_RANGE,
  SWING_LEVEL_RESISTANCE,
  SWING_LEVEL_SUPPORT,
  SWING_LOADING,
  SWING_RETRY,
  SWING_STATE_ERROR,
  describeExclusion,
  describeItem,
  swingBasisLabel,
  swingExclusionLabel,
  swingMetChip,
  swingStatsSentence,
} from "@/lib/copy/swing/labels";

const TITLE_ID = "swing-judgment-card-title";

export function SwingJudgmentCard({ ticker }: { ticker: string }) {
  const { data, isLoading, isError, error, refetch } = useQuerySwingJudgment(ticker);

  if (isLoading) {
    return (
      <div aria-busy="true" className="flex flex-col gap-md">
        <span className="sr-only">{SWING_LOADING}</span>
        <Skeleton variant="line-narrow" />
        <Skeleton variant="line" />
        <Skeleton variant="line" />
        <Skeleton variant="line-medium" />
      </div>
    );
  }
  if (isError || !data) {
    // 404 = 지원하지 않는 종목(국내 6자리 아님) — 다시 시도해도 같다.
    return (
      <section aria-labelledby={TITLE_ID} className="flex flex-col items-start gap-md" role="alert">
        <h2 id={TITLE_ID} className="text-h2 text-text-strong">
          {SWING_CARD_TITLE}
        </h2>
        <p className="text-body-sm text-text-muted">{error?.message ?? SWING_STATE_ERROR}</p>
        {error?.status === 404 ? null : (
          <button type="button" className="button-secondary" onClick={() => refetch()}>
            {SWING_RETRY}
          </button>
        )}
      </section>
    );
  }
  return <JudgmentBody data={data} />;
}

function JudgmentBody({ data }: { data: SwingJudgmentResponse }) {
  const j = data.judgment;
  const statsLine = swingStatsSentence(data.stats.grade, SWING_GRADE_COHORT_LABEL[j.grade]);
  return (
    <section aria-labelledby={TITLE_ID} className="flex flex-col gap-lg">
      <header className="flex flex-col gap-xs">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <h2 id={TITLE_ID} className="text-h2 text-text-strong">
            {SWING_CARD_TITLE}
          </h2>
          <Badge variant="accent">{swingMetChip(metCount(j.items))}</Badge>
        </div>
        <p className="text-caption text-text-muted">
          {swingBasisLabel(data.tradeDate)} · {SWING_CARD_HELP}
        </p>
      </header>

      {j.exclusions.length > 0 ? <CautionCallout j={j} statsLine={statsLine} /> : null}

      <ul className="flex flex-col">
        {SWING_CHECK_ROWS.map((key) => {
          const pass = j.items[key].pass;
          return (
            <li key={key} className="flex items-start justify-between gap-md border-b border-border-line py-sm last:border-b-0">
              <div className="flex min-w-0 flex-col gap-xs">
                <span className="text-body-sm-strong text-text-strong">{SWING_ITEM_LABEL[key]}</span>
                <span className="text-caption text-text-muted">{describeItem(key, j, RULEBOOK)}</span>
              </div>
              <span className={cn("shrink-0 text-label-sm", pass === true ? "text-outcome-hit" : "text-text-muted")}>
                {pass === true ? (
                  SWING_CHECK_PASS
                ) : pass === false ? (
                  <>
                    <span aria-hidden="true">{SWING_CHECK_MISS}</span>
                    <span className="sr-only">{SWING_CHECK_MISS_SR}</span>
                  </>
                ) : (
                  SWING_CHECK_UNKNOWN
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {j.plan ? (
        <dl className="grid grid-cols-3 gap-md">
          <Level label={SWING_LEVEL_SUPPORT} value={price(j.plan.support)} />
          <Level label={SWING_LEVEL_RESISTANCE} value={price(j.plan.resistance)} />
          <Level
            label={SWING_LEVEL_RANGE}
            value={j.plan.typicalMove10Pct === null ? "—" : `±${j.plan.typicalMove10Pct.toFixed(1)}%`}
          />
        </dl>
      ) : null}

      {j.exclusions.length === 0 && statsLine ? <p className="text-caption text-text-muted">{statsLine}</p> : null}
      <p className="text-caption text-text-muted">{SWING_DISCLAIMER}</p>
    </section>
  );
}

function CautionCallout({ j, statsLine }: { j: SwingJudgment; statsLine: string | null }) {
  return (
    <div className="flex flex-col gap-sm rounded-md bg-warn-soft p-lg text-warn">
      <p className="text-body-sm-strong">{SWING_CAUTION_TITLE}</p>
      <ul className="flex flex-col gap-xs">
        {j.exclusions.map((code) => (
          <li key={code} className="text-body-sm">
            <span className="font-bold">{swingExclusionLabel(code)}</span> — {describeExclusion(code, j, RULEBOOK)}
          </li>
        ))}
      </ul>
      {statsLine ? <p className="text-caption">{statsLine}</p> : null}
    </div>
  );
}

function Level({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-xs">
      <dt className="text-caption text-text-muted">{label}</dt>
      <dd className="text-body-sm-strong tabular-nums text-text-strong">{value}</dd>
    </div>
  );
}

// 매물대 경계는 계산값이라 호가 단위로 맞춰 보여 준다.
const price = (x: number | null) => (x === null ? "—" : formatNumber(roundToKrxTick(x), { digits: 0 }));
