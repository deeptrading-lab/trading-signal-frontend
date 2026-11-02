/**
 * SwingScreenerTable — `/swing` 조건 매트릭스(증권사 스크리너형).
 *
 * 행 = 종목, 열 = 조건(수급 4 · 가격·추세 4). 칸마다 ● 충족 / ▲ 불리한 신호 / ○ 해당 없음.
 * 열 이름은 버튼 — 마우스를 올리거나 누르면(포커스) 기준·불리 뜻이 말풍선으로 뜬다(JS 상태 없이 CSS).
 * 모바일은 같은 표시를 쓰는 압축 행 + "조건 기준 보기"(접기) 목록.
 * 불리한 신호는 표시 전용 — 판정·충족 수에는 쓰지 않는다(`lib/swing/itemBits` adverseBits).
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatMoney";
import { stockDetailPath } from "@/lib/utils/stockDetailPath";
import { hasAdverseBit, hasItemBit } from "@/lib/swing/itemBits";
import type { SwingScreenerItem } from "@/lib/types/swing/api";
import {
  SWING_COL_CAUTION,
  SWING_COL_CLOSE,
  SWING_COL_MET,
  SWING_COL_STOCK,
  SWING_DOT_ADVERSE,
  SWING_DOT_MET,
  SWING_DOT_MISS,
  SWING_HINT_ADVERSE,
  SWING_HINT_MET,
  SWING_LEGEND_ADVERSE,
  SWING_LEGEND_DETAILS,
  SWING_LEGEND_HELP,
  SWING_LEGEND_MET,
  SWING_LEGEND_MISS,
  SWING_MATRIX_COLUMNS,
  SWING_MATRIX_GROUP_CHART,
  SWING_MATRIX_GROUP_FLOW,
  swingExclusionLabel,
  swingStageLabel,
} from "@/lib/copy/swing/labels";

type Column = (typeof SWING_MATRIX_COLUMNS)[number];
type MarkState = "met" | "adverse" | "none";

const FLOW_COLS = SWING_MATRIX_COLUMNS.filter((c) => c.group === "flow");
const CHART_COLS = SWING_MATRIX_COLUMNS.filter((c) => c.group === "chart");

function stateOf(item: SwingScreenerItem, c: Column): MarkState {
  if (hasItemBit(item.items, c.key)) return "met";
  if (c.adverse && hasAdverseBit(item.items, c.key)) return "adverse";
  // 추세는 저장된 국면으로도 알 수 있다(불리 비트가 생기기 전 행 포함).
  if (c.key === "C" && (item.stage === "overheated" || item.stage === "downtrend")) return "adverse";
  return "none";
}

function Mark({ state, dim }: { state: MarkState; dim?: boolean }) {
  return (
    <span className={cn("inline-flex h-3 w-3 items-center justify-center", dim && "opacity-40")}>
      {state === "met" ? (
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-pill bg-signal-done" />
      ) : state === "adverse" ? (
        <span aria-hidden="true" className="text-caption leading-none text-warn">
          ▲
        </span>
      ) : (
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-pill border border-text-muted opacity-60" />
      )}
      <span className="sr-only">
        {state === "met" ? SWING_DOT_MET : state === "adverse" ? SWING_DOT_ADVERSE : SWING_DOT_MISS}
      </span>
    </span>
  );
}

function HintBody({ c }: { c: Column }) {
  return (
    <>
      <span className="block text-body-sm-strong text-text-strong">{c.label}</span>
      <span className="mt-xs flex gap-xs">
        <Mark state="met" />
        <span>
          <span className="text-text-strong">{SWING_HINT_MET}</span> {c.hint}
        </span>
      </span>
      {c.adverse ? (
        <span className="mt-xs flex gap-xs">
          <Mark state="adverse" />
          <span>
            <span className="text-warn">{SWING_HINT_ADVERSE}</span> {c.adverse}
          </span>
        </span>
      ) : null}
    </>
  );
}

/** 열 이름 — 누르거나 마우스를 올리면 말풍선(포커스 유지 동안 열림). */
function ColumnHint({ c, alignRight }: { c: Column; alignRight: boolean }) {
  return (
    <span className="group relative inline-block">
      <button
        type="button"
        className="rounded-sm text-caption text-text-muted underline decoration-dotted underline-offset-4 hover:text-text-strong focus-visible:text-text-strong focus-visible:outline-none"
      >
        {c.label}
      </button>
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute top-full z-10 mt-xs hidden w-[16rem] rounded-md border border-border-line bg-surface p-md text-left text-caption font-normal text-text-muted shadow-md group-focus-within:block group-hover:block",
          alignRight ? "right-0" : "left-1/2 -translate-x-1/2",
        )}
      >
        <HintBody c={c} />
      </span>
    </span>
  );
}

function Reasons({ codes }: { codes: string[] }) {
  return (
    <span className="flex flex-wrap gap-xs">
      {codes.map((code) => (
        <Badge key={code} variant="warn">
          {swingExclusionLabel(code)}
        </Badge>
      ))}
    </span>
  );
}

/** 범례 + 조건 기준(접기) — 모바일에서도 기준을 볼 수 있게. */
function Legend() {
  return (
    <div className="flex flex-col gap-sm">
      <p className="flex flex-wrap items-center gap-md text-caption text-text-muted">
        <span className="inline-flex items-center gap-xs">
          <Mark state="met" /> {SWING_LEGEND_MET}
        </span>
        <span className="inline-flex items-center gap-xs">
          <Mark state="adverse" /> {SWING_LEGEND_ADVERSE}
        </span>
        <span className="inline-flex items-center gap-xs">
          <Mark state="none" /> {SWING_LEGEND_MISS}
        </span>
        <span className="hidden md:inline">· {SWING_LEGEND_HELP}</span>
      </p>
      <details className="text-caption text-text-muted md:hidden">
        <summary className="cursor-pointer text-text-strong">{SWING_LEGEND_DETAILS}</summary>
        <ul className="mt-sm flex flex-col gap-md">
          {SWING_MATRIX_COLUMNS.map((c) => (
            <li key={c.key}>
              <HintBody c={c} />
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

export function SwingScreenerTable({ items, showReasons }: { items: SwingScreenerItem[]; showReasons: boolean }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-md">
      <Legend />

      {/* 데스크톱 — 조건 매트릭스 표 */}
      <table className="hidden w-full border-collapse text-body-sm md:table">
        <thead>
          <tr className="text-caption text-text-muted">
            <th scope="col" rowSpan={2} className="py-sm text-left font-normal">
              {SWING_COL_STOCK}
            </th>
            <th scope="col" rowSpan={2} className="py-sm pr-lg text-right font-normal">
              {SWING_COL_CLOSE}
            </th>
            <th scope="colgroup" colSpan={FLOW_COLS.length} className="border-l border-border-line pb-xs text-center font-normal">
              {SWING_MATRIX_GROUP_FLOW}
            </th>
            <th scope="colgroup" colSpan={CHART_COLS.length} className="border-l border-border-line pb-xs text-center font-normal">
              {SWING_MATRIX_GROUP_CHART}
            </th>
            <th scope="col" rowSpan={2} className="border-l border-border-line py-sm text-center font-normal">
              {SWING_COL_MET}
            </th>
            {showReasons ? (
              <th scope="col" rowSpan={2} className="py-sm pl-md text-left font-normal">
                {SWING_COL_CAUTION}
              </th>
            ) : null}
          </tr>
          <tr className="border-b border-border-line">
            {SWING_MATRIX_COLUMNS.map((c, i) => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  "px-sm pb-sm text-center font-normal",
                  (i === 0 || i === FLOW_COLS.length) && "border-l border-border-line",
                )}
              >
                <ColumnHint c={c} alignRight={i >= SWING_MATRIX_COLUMNS.length - 2} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const excluded = item.exclusions.length > 0;
            const href = stockDetailPath(item.ticker, item.name);
            return (
              <tr
                key={item.ticker}
                onClick={() => router.push(href)}
                className="cursor-pointer border-b border-border-line transition-colors last:border-b-0 hover:bg-surface-muted"
              >
                <td className="py-md">
                  <Link href={href} className="text-body-sm-strong text-text-strong hover:underline" onClick={(e) => e.stopPropagation()}>
                    {item.name}
                  </Link>
                  <span className="mt-xs block text-caption text-text-muted">
                    {item.market} · {swingStageLabel(item.stage)}
                  </span>
                </td>
                <td className="py-md pr-lg text-right tabular-nums text-text-strong">{formatNumber(item.close, { digits: 0 })}</td>
                {SWING_MATRIX_COLUMNS.map((c, i) => (
                  <td
                    key={c.key}
                    className={cn("px-sm py-md text-center", (i === 0 || i === FLOW_COLS.length) && "border-l border-border-line")}
                  >
                    <Mark state={stateOf(item, c)} dim={excluded} />
                  </td>
                ))}
                <td className="border-l border-border-line px-sm py-md text-center text-body-sm-strong tabular-nums text-text-strong">
                  {item.metCount}
                  <span className="text-caption text-text-muted">/7</span>
                </td>
                {showReasons ? (
                  <td className="py-md pl-md">{excluded ? <Reasons codes={item.exclusions} /> : null}</td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* 모바일 — 압축 행: 이름·종가 / 8칸 표시 / 주의 사유 */}
      <ul className="md:hidden">
        {items.map((item) => {
          const excluded = item.exclusions.length > 0;
          return (
            <li key={item.ticker} className="border-b border-border-line last:border-b-0">
              <Link
                href={stockDetailPath(item.ticker, item.name)}
                className="-mx-sm flex flex-col gap-sm rounded-sm px-sm py-md transition-colors hover:bg-surface-muted"
              >
                <span className="flex items-baseline justify-between gap-md">
                  <span className="min-w-0 truncate text-body-sm-strong text-text-strong">{item.name}</span>
                  <span className="shrink-0 text-body-sm-strong tabular-nums text-text-strong">
                    {formatNumber(item.close, { digits: 0 })}
                  </span>
                </span>
                <span className="text-caption text-text-muted">
                  {item.market} · {swingStageLabel(item.stage)} · {SWING_COL_MET} {item.metCount}/7
                </span>
                <span className="grid grid-cols-2 gap-x-md gap-y-xs">
                  {SWING_MATRIX_COLUMNS.map((c) => {
                    const st = stateOf(item, c);
                    return (
                      <span
                        key={c.key}
                        className={cn(
                          "flex items-center gap-xs text-caption",
                          st === "met" ? "text-text-strong" : st === "adverse" ? "text-warn" : "text-text-muted",
                        )}
                      >
                        <Mark state={st} dim={excluded} />
                        {c.label}
                      </span>
                    );
                  })}
                </span>
                {excluded ? <Reasons codes={item.exclusions} /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
