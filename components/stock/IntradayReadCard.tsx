/**
 * IntradayReadCard — 장중 단타 판단(참고) 결과 표시 (순수 컴포넌트). intraday-scalping-agent §0.
 *
 * 결정론 레벨(매물대/박스/구조 TP·SL) + 2-에이전트 서사를 **사람 판단 보조**로 보여준다.
 * ⚠️ 자동 수익/집행 주장 없음 — IntradayReadSection(상태/트리거) 또는 B 워크스페이스가 재사용.
 */

"use client";

import { cn } from "@/lib/utils/cn";
import { formatMoney } from "@/lib/utils/formatMoney";
import { roundToKrxTick } from "@/lib/utils/krxTick";
import { AXIS_LABEL } from "@/lib/copy/signal/labels";
import { INTRADAY_READ_COPY as C } from "@/lib/copy/stock/intradayRead";
import type { IntradayAction, IntradayReadResponse } from "@/lib/types/intraday/intradayDecision";

const ACTION_BADGE: Record<IntradayAction, string> = {
  BUY: "badge-signal-up",
  HOLD: "badge-info",
  SELL: "badge-signal-down",
};

const won = (v: number | null | undefined): string =>
  v == null ? C.none : formatMoney(roundToKrxTick(v));
const pct = (v: number | null | undefined): string =>
  v == null ? C.none : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
const timeOf = (asOf: string): string => asOf.slice(11) || asOf;

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-sm">
      <span className="text-caption text-text-muted">{label}</span>
      <span className={cn("text-body tabular-nums", tone ?? "text-text-strong")}>{value}</span>
    </div>
  );
}

export function IntradayReadCard({ data }: { data: IntradayReadResponse }) {
  const { decision: d, levels: lv, signal: s } = data;

  return (
    <div className="flex flex-col gap-md">
      {/* 헤더 — 판단 + 신뢰도 + 현재가 */}
      <div className="flex flex-wrap items-center gap-sm">
        <span className={cn("badge-info", ACTION_BADGE[d.action])}>{C.action[d.action]}</span>
        <span className="text-caption text-text-muted">신뢰도 {C.confidence[d.confidence]}</span>
        <span className="ml-auto text-caption text-text-muted">
          {timeOf(data.asOf)} · {data.timeframe}분봉 · {won(data.price)}
        </span>
      </div>

      {data.warning && <div className="card-warn text-caption">{data.warning}</div>}

      {/* ② 진입·청산 판단 */}
      <section className="flex flex-col gap-xs">
        <h4 className="text-caption font-medium text-text-muted">{C.sectionJudge}</h4>
        <p className="text-body text-text-strong">{d.rationale || C.none}</p>
        {d.action === "BUY" && (
          <div className="mt-xs flex flex-col gap-xs">
            {d.entryZone && (
              <Row label={C.field.entryZone} value={`${won(d.entryZone.low)} ~ ${won(d.entryZone.high)}`} />
            )}
            <Row label={C.field.target} value={`${won(d.targetPrice)} (${pct(lv.tpPct)})`} tone="text-signal-up" />
            <Row label={C.field.stop} value={`${won(d.stopPrice)} (${pct(lv.slPct)})`} tone="text-signal-down" />
            <Row label={C.field.rrr} value={lv.rrr != null ? `${lv.rrr.toFixed(2)} : 1` : C.none} />
            {d.expectedHoldingMinutes != null && (
              <Row label={C.field.holding} value={`${d.expectedHoldingMinutes}분`} />
            )}
          </div>
        )}
        {d.riskNotes.length > 0 && (
          <ul className="mt-xs flex flex-col gap-[2px]">
            {d.riskNotes.map((n, i) => (
              <li key={i} className="text-caption text-text-muted">· {n}</li>
            ))}
          </ul>
        )}
      </section>

      {/* ① 흐름·세력 진단 */}
      {d.analystNote && (
        <section className="flex flex-col gap-xs">
          <h4 className="text-caption font-medium text-text-muted">{C.sectionSetup}</h4>
          <p className="text-body text-text-default whitespace-pre-wrap">{d.analystNote}</p>
        </section>
      )}

      {/* 구조 레벨 + 분봉 시그널 */}
      <section className="flex flex-col gap-xs border-t border-border-line pt-sm">
        <h4 className="text-caption font-medium text-text-muted">{C.sectionLevels}</h4>
        <Row label={C.field.box} value={`${won(lv.boxLow)} ~ ${won(lv.boxHigh)}`} />
        <Row
          label={C.field.signal}
          value={`${s.action} · ${s.score.toFixed(0)}/100 · ${C.field.regime} ${C.regimeLabel[String(s.regime)] ?? s.regime}`}
        />
        <div className="mt-xs flex flex-wrap gap-xs">
          {s.axes.map((a) => (
            <span key={a.axis} className="text-caption px-xs py-[1px] rounded bg-surface-muted text-text-muted">
              {AXIS_LABEL[a.axis]} {a.score.toFixed(0)}
            </span>
          ))}
        </div>
      </section>

      {d.gateAdjustments.length > 0 && (
        <div className="text-caption text-text-muted">
          {C.gateNote}: {d.gateAdjustments.join(" · ")}
        </div>
      )}

      <p className="text-caption text-text-muted border-t border-border-line pt-sm">{C.disclaimer}</p>
    </div>
  );
}
