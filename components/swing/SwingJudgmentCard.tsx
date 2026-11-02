/**
 * SwingJudgmentCard — 종목 상세 "스윙 체크" 카드(PRD `swing-judgment` PR-3, 디자인 swing-ui 표면 B).
 *
 * 국내 종목에서 기존 4축 시그널 요약 자리를 대체한다(미국 종목은 StockPageLayout 이 기존 요약 유지).
 * 순서: 제목·기준일·충족 n/7 → 주의 사유(있을 때만, 실측값+기준값+과거 통계) → 조건 체크리스트
 * → 참고 지지·저항·2주 통상 변동폭 → 과거 통계 → 면책. 판정은 서버가 규칙서로 계산한 값을 그대로 쓴다.
 */

"use client";

import { useId, type ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useQuerySwingJudgment } from "@/hooks/swing/useQuerySwingJudgment";
import { SwingNoteSection } from "./SwingNoteSection";
import { adverseBits, hasAdverseBit, hasItemBit, metCount, type SwingItemKey } from "@/lib/swing/itemBits";
import type { SwingJudgment } from "@/lib/swing/judge";
import { RULEBOOK } from "@/lib/swing/rulebook";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatMoney";
import { roundToKrxTick } from "@/lib/utils/krxTick";
import type { SwingJudgmentResponse, SwingJudgmentUnavailable, SwingScreenerItem } from "@/lib/types/swing/api";
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
  SWING_HINT_ADVERSE,
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
  swingMetChipSr,
  SWING_STORED_NOTE,
  swingStageLabel,
  SWING_SECTION_CHECK,
  SWING_SECTION_LEVELS,
  SWING_SECTION_STATS,
  SWING_STATS_N,
  SWING_STATS_UP,
  SWING_STATS_BASE,
  SWING_STATS_EXCESS,
  SWING_STATS_COHORT,
  SWING_CHECK_GROUPS,
  SWING_MATRIX_COLUMNS,
  swingPpLabel,
} from "@/lib/copy/swing/labels";


/**
 * @param fallback 스윙 체크를 지원하지 않는 종목(404 — ETF·ETN 등)에서 대신 보여 줄 노드. 미국 종목처럼
 *   기존 요약을 유지하려는 용도. 없으면 안내 문구.
 */
export function SwingJudgmentCard({ ticker, fallback }: { ticker: string; fallback?: ReactNode }) {
  const { data, isLoading, error, refetch } = useQuerySwingJudgment(ticker);
  // 같은 카드가 페이지와 사이드 패널에 동시에 있을 수 있어 제목 id 는 인스턴스마다 따로.
  const titleId = useId();

  // 백그라운드 재요청이 실패해도 이미 받은 판정이 있으면 그대로 보여 준다.
  if (data) return <JudgmentBody data={data} />;
  if (error?.status === 404 && fallback) return <>{fallback}</>;
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
  // 야간 점검 등으로 즉시 계산이 막히면 서버가 그 거래일 스크리너 저장 행을 함께 준다 — 축약 표시.
  const unavailable = error?.detail as SwingJudgmentUnavailable | undefined;
  if (unavailable?.stored && unavailable.tradeDate) {
    return <StoredSummary item={unavailable.stored} tradeDate={unavailable.tradeDate} onRetry={() => refetch()} />;
  }
  // 페이지 진입 때 자동으로 뜨는 카드라 role="alert" 로 알리지 않는다(지원 안 함 404 는 예상된 상태).
  // 404 = 지원하지 않는 종목 — 다시 시도해도 같다.
  return (
    <section aria-labelledby={titleId} className="flex flex-col items-start gap-md">
      <h2 id={titleId} className="text-h2 text-text-strong">
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

/** 저장된 스크리너 행으로 그리는 축약 카드 — 충족·불리 여부와 주의 사유만(수치는 즉시 계산이 돌아오면). */
function StoredSummary({ item, tradeDate, onRetry }: { item: SwingScreenerItem; tradeDate: string; onRetry: () => void }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-lg">
      <header className="flex flex-col gap-xs">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <h2 id={titleId} className="text-h2 text-text-strong">
            {SWING_CARD_TITLE}
          </h2>
          <Badge variant="accent">
            <span aria-hidden="true">{swingMetChip(item.metCount)}</span>
            <span className="sr-only">{swingMetChipSr(item.metCount)}</span>
          </Badge>
        </div>
        <p className="text-caption text-text-muted">
          {swingBasisLabel(tradeDate)} · {swingStageLabel(item.stage)}
        </p>
        <p className="text-caption text-warn">{SWING_STORED_NOTE}</p>
      </header>
      {item.exclusions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-xs">
          <span className="text-body-sm-strong text-warn">{SWING_CAUTION_TITLE}</span>
          {item.exclusions.map((code) => (
            <Badge key={code} variant="warn">
              {swingExclusionLabel(code)}
            </Badge>
          ))}
        </div>
      ) : null}
      <ul className="flex flex-col">
        {SWING_CHECK_ROWS.map((key) => {
          const met = hasItemBit(item.items, key);
          const bad =
            !met &&
            (hasAdverseBit(item.items, key) || (key === "C" && (item.stage === "overheated" || item.stage === "downtrend")));
          return (
            <li key={key} className="flex items-center justify-between gap-md border-b border-border-line py-sm last:border-b-0">
              <span className="text-body-sm-strong text-text-strong">{SWING_ITEM_LABEL[key]}</span>
              <span className={cn("shrink-0 text-label-sm", met ? "text-outcome-hit" : bad ? "text-warn" : "text-text-muted")}>
                {met ? SWING_CHECK_PASS : bad ? `▲ ${SWING_HINT_ADVERSE}` : SWING_CHECK_MISS}
              </span>
            </li>
          );
        })}
      </ul>
      <button type="button" className="button-secondary self-start" onClick={onRetry}>
        {SWING_RETRY}
      </button>
      <p className="text-caption text-text-muted">{SWING_DISCLAIMER}</p>
    </section>
  );
}

function JudgmentBody({ data }: { data: SwingJudgmentResponse }) {
  const titleId = useId();
  const j = data.judgment;
  // 불리한 신호(표시 전용) — 목록 매트릭스와 같은 정의.
  const adverse = adverseBits(j.features, RULEBOOK);
  const met = metCount(j.items);
  const cell = data.stats.grade;
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-xl">
      <header className="flex flex-col gap-xs">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <h2 id={titleId} className="text-h2 text-text-strong">
            {SWING_CARD_TITLE}
          </h2>
          <Badge variant="accent">
            <span aria-hidden="true">{swingMetChip(met)}</span>
            <span className="sr-only">{swingMetChipSr(met)}</span>
          </Badge>
        </div>
        <p className="text-caption text-text-muted">
          {swingBasisLabel(data.tradeDate)} · {SWING_CARD_HELP}
        </p>
      </header>

      {j.exclusions.length > 0 ? <CautionCallout j={j} /> : null}

      {/* ① 조건 체크 — 수급·가격추세 두 묶음, 결과는 색 칩 */}
      <div className="flex flex-col gap-sm">
        <SectionTitle>{SWING_SECTION_CHECK}</SectionTitle>
        {SWING_CHECK_GROUPS.map((g) => (
          <div key={g.title} className="overflow-hidden rounded-md border border-border-line">
            <p className="bg-surface-muted px-md py-xs text-caption text-text-muted">{g.title}</p>
            <ul className="divide-y divide-border-line">
              {g.keys.map((key) => {
                const pass = j.items[key].pass;
                const state: CheckState =
                  pass === true ? "met" : hasAdverseBit(adverse, key) ? "adverse" : pass === false ? "miss" : "unknown";
                return (
                  <li key={key} className="flex items-center justify-between gap-md px-md py-sm">
                    <div className="flex min-w-0 flex-col">
                      <span className="text-body-sm-strong text-text-strong">{checkLabel(key)}</span>
                      <span className="text-caption tabular-nums text-text-muted">{describeItem(key, j, RULEBOOK)}</span>
                    </div>
                    <StatusChip state={state} />
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* ② 참고 가격대 — 차트 점선과 같은 색 점 */}
      {j.plan ? (
        <div className="flex flex-col gap-sm">
          <SectionTitle>{SWING_SECTION_LEVELS}</SectionTitle>
          <dl className="grid grid-cols-3 gap-sm">
            <Tile label={SWING_LEVEL_SUPPORT} dot="bg-chart-hist-up" value={price(j.plan.support)} />
            <Tile label={SWING_LEVEL_RESISTANCE} dot="bg-chart-signal" value={price(j.plan.resistance)} />
            <Tile
              label={SWING_LEVEL_RANGE}
              value={j.plan.typicalMove10Pct === null ? "—" : `±${j.plan.typicalMove10Pct.toFixed(1)}%`}
            />
          </dl>
        </div>
      ) : null}

      {/* ③ 과거 통계 — 문장 대신 숫자 3칸 */}
      {cell && !cell.hidden && cell.upRate !== null && cell.baseUpRate !== null && cell.meanExcess10 !== null ? (
        <div className="flex flex-col gap-sm">
          <SectionTitle>{SWING_SECTION_STATS}</SectionTitle>
          <dl className="grid grid-cols-3 gap-sm">
            <Tile label={SWING_STATS_N} value={`${cell.n.toLocaleString("ko-KR")}건`} />
            <Tile
              label={SWING_STATS_UP}
              value={`${Math.round(cell.upRate * 100)}%`}
              sub={`${SWING_STATS_BASE} ${Math.round(cell.baseUpRate * 100)}%`}
            />
            <Tile label={SWING_STATS_EXCESS} value={swingPpLabel(cell.meanExcess10)} />
          </dl>
          <p className="text-caption text-text-muted">
            {SWING_STATS_COHORT(SWING_GRADE_COHORT_LABEL[j.grade])}
          </p>
        </div>
      ) : null}

      {/* ④ AI 노트 — 판정과 별개 섹션. 사용자가 요청할 때만 만든다. */}
      <SwingNoteSection ticker={j.ticker} />

      <p className="text-caption text-text-muted">{SWING_DISCLAIMER}</p>
    </section>
  );
}

type CheckState = "met" | "adverse" | "miss" | "unknown";

/** 목록 매트릭스와 같은 쉬운 이름(개인 매도·지지선 …). */
function checkLabel(key: SwingItemKey): string {
  return SWING_MATRIX_COLUMNS.find((c) => c.key === key)?.label ?? SWING_ITEM_LABEL[key];
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-body-strong font-bold text-text-strong">{children}</h3>;
}

function StatusChip({ state }: { state: CheckState }) {
  const [text, cls] =
    state === "met"
      ? [SWING_CHECK_PASS, "bg-signal-done-soft text-outcome-hit"]
      : state === "adverse"
        ? [`▲ ${SWING_HINT_ADVERSE}`, "bg-warn-soft text-warn"]
        : state === "miss"
          ? [SWING_CHECK_MISS_SR, "bg-surface-muted text-text-muted"]
          : [SWING_CHECK_UNKNOWN, "bg-surface-muted text-text-muted"];
  return <span className={cn("shrink-0 rounded-pill px-sm py-xs text-caption font-bold", cls)}>{text}</span>;
}

function CautionCallout({ j }: { j: SwingJudgment }) {
  return (
    <div className="flex flex-col gap-sm rounded-md bg-warn-soft p-lg text-warn">
      <h3 className="text-body-sm-strong">{SWING_CAUTION_TITLE}</h3>
      <ul className="flex flex-col gap-xs">
        {j.exclusions.map((code) => (
          <li key={code} className="text-body-sm">
            <span className="font-bold">{swingExclusionLabel(code)}</span> — {describeExclusion(code, j, RULEBOOK)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tile({ label, value, sub, dot }: { label: string; value: string; sub?: string; dot?: string }) {
  return (
    <div className="flex flex-col gap-xs rounded-md bg-surface-muted p-md">
      <dt className="flex items-center gap-xs text-caption text-text-muted">
        {dot ? <span aria-hidden="true" className={cn("h-2 w-2 rounded-pill", dot)} /> : null}
        {label}
      </dt>
      <dd className="text-body-sm-strong tabular-nums text-text-strong">{value}</dd>
      {sub ? <dd className="text-caption text-text-muted">{sub}</dd> : null}
    </div>
  );
}

// 매물대 경계는 계산값이라 호가 단위로 맞춰 보여 준다.
const price = (x: number | null) => (x === null ? "—" : formatNumber(roundToKrxTick(x), { digits: 0 }));
