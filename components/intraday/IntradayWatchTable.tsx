/**
 * IntradayWatchTable — 워치 종목 컴팩트 표 (토스 랭킹 표 스타일). intraday-paper-watch.
 *
 * 행 = 종목 | 현재가 | 등락률 | 모의 수익률 | 평가금액 | 포지션 | 최근 판단 | 모의 투자금(input)
 *      | 액션(판단·모의 시작·일시정지·제거·펼침 — 전부 컬럼 속성으로, 피드백 반영).
 * 종목 코드는 표시하지 않는다. 행 클릭(또는 펼침) → 판단 결과 카드·체결 내역 진입.
 * ⚠️ 의사결정 보조·가상 체결 — 자동 수익/집행 주장 없음.
 *
 * intraday-table-refactor — 본 파일은 표 셸(날짜 그룹핑·헤더·펼침 그룹 제어)만 남기고,
 * 행(`WatchRow`)과 전속 부품은 `IntradayWatchRow.tsx` 로 분리(memo 행). 행 펼침은 표 레벨
 * `expandedTicker` **아코디언(동시 1행)** — 펼침 패널의 3초 폴링(호가+체결강도)이 행 수와
 * 무관하게 최대 1쌍으로 상한된다(모바일 부하 완화, 코드 상수·env 손잡이 없음).
 */

"use client";

import { Fragment, useCallback, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatMoney } from "@/lib/utils/formatMoney";
import { IntradayWatchRow, ROW_ENTER } from "@/components/intraday/IntradayWatchRow";
import { INTRADAY_PAPER_COPY as P } from "@/lib/copy/stock/intradayRead";
import type { WatchlistQuote } from "@/lib/api/watchlist/list";
import type {
  PaperTradingSelectedStock,
  PaperTradingSession,
  PaperTradingSessionDetail,
} from "@/lib/types/paperTrading/paperTrading";
import type { StockWarningItem } from "@/lib/types/stock/warnings";

const T = P.table;

// ─── 날짜별 그룹(세션 시작일 KST 기준) ────────────────────────────────────────
/** ISO → KST YYYY-MM-DD 그룹/정렬 키. 파싱 실패면 null. */
function kstDateKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  // en-CA 로케일 = YYYY-MM-DD. Asia/Seoul(거래일) 기준으로 그룹·정렬한다.
  return new Date(ms).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

export type WatchItem = {
  ticker: string;
  name: string;
  /**
   * 행 식별자 — 미지정이면 ticker(오늘 표: 종목당 1행이라 기존 동작 그대로).
   *
   * 과거 표는 같은 종목이 날짜별로 여러 행이므로 세션 id 를 넣는다. 예전엔 행 정체성이 ticker 라
   * 같은 종목의 옛 날짜 세션이 통째로 삼켜졌다(과거 내역에서 종목당 최신 1건만 보이던 원인).
   * React key · 펼침 아코디언 · 세션 맵 키가 이 값을 쓰고, **시세·경보·선택은 계속 ticker 기준**이다.
   */
  rowKey?: string;
};

/** 행 식별자 해석 — 미지정이면 ticker 폴백(오늘 표 무회귀). */
export function watchRowKey(item: WatchItem): string {
  return item.rowKey ?? item.ticker;
}

/** 날짜 그룹 1개 — 세션 시작일(KST) 키 + 그 날 워치 행들. */
export type WatchDateGroup = { dateKey: string; items: WatchItem[] };

/**
 * 워치 행을 세션 시작일(KST) 기준으로 그룹핑(최신 날짜 먼저). 세션 없는 워치 행(검색 추가)은 오늘로.
 * 표 렌더와 워크스페이스의 "펼친 과거 그룹 시세 지연로드" 계산이 같은 그룹핑을 공유하도록 순수 함수로 분리.
 */
export function groupWatchItemsByDate(
  items: WatchItem[],
  sessionByRowKey: Map<string, PaperTradingSession>,
  todayKey: string,
): WatchDateGroup[] {
  const map = new Map<string, WatchItem[]>();
  for (const item of items) {
    const session = sessionByRowKey.get(watchRowKey(item));
    const key = (session && kstDateKey(session.startedAt ?? session.createdAt)) || todayKey;
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([dateKey, groupItems]) => ({ dateKey, items: groupItems }));
}

/** 그룹 헤더 라벨 — 오늘/어제/그 외 M/D. */
function groupLabel(dateKey: string, todayKey: string, yesterdayKey: string): string {
  const [, m, d] = dateKey.split("-");
  const md = `${Number(m)}/${Number(d)}`;
  if (dateKey === todayKey) return `${T.groupToday} · ${md}`;
  if (dateKey === yesterdayKey) return `${T.groupYesterday} · ${md}`;
  return md;
}

/** 당일 요약 — 그 날 세션들의 합산 수익률(자금가중)·승/패·진행중. 세션 없는 워치 행은 제외. */
type DaySummary = {
  sessions: number;
  wins: number;
  losses: number;
  running: number;
  aggReturnPct: number | null;
  /** 그날 세션들의 합산 손익(원) — 평가금액-투자금 합. 벌었으면 +, 잃었으면 −. */
  totalPnl: number;
};
function daySummary(
  items: WatchItem[],
  sessionByRowKey: Map<string, PaperTradingSession>,
): DaySummary {
  let sessions = 0, wins = 0, losses = 0, running = 0, totalInit = 0, totalPnl = 0;
  for (const item of items) {
    const s = sessionByRowKey.get(watchRowKey(item));
    if (!s) continue;
    sessions++;
    if (s.status === "running") running++;
    if (s.returnPct > 0) wins++;
    else if (s.returnPct < 0) losses++;
    totalInit += s.initialCash;
    totalPnl += s.portfolioValue - s.initialCash;
  }
  return {
    sessions,
    wins,
    losses,
    running,
    aggReturnPct: totalInit > 0 ? (totalPnl / totalInit) * 100 : null,
    totalPnl,
  };
}

/** 그룹 요약 수익률 표기 — 행(IntradayWatchRow) 쪽 formatPct 와 동일 규칙(+부호·소수 2자리). */
function formatPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

/** 그룹 내부 컬럼 헤더 행 — 날짜를 펼쳤을 때 그 그룹 안에 표시(전역 thead 대신 그룹별). */
function GroupColumnHeader() {
  return (
    <motion.tr
      {...ROW_ENTER}
      className="border-b border-border-line text-caption text-text-muted"
    >
      <th className="py-sm pl-lg pr-md text-left font-normal">{T.colStock}</th>
      <th className="py-sm pr-md text-right font-normal">{T.colPrice}</th>
      <th className="py-sm pr-md text-right font-normal">{T.colChange}</th>
      <th className="border-l border-border-line py-sm pl-md pr-md text-right font-normal">
        {T.colReturn}
      </th>
      <th className="py-sm pr-md text-right font-normal">{T.colValue}</th>
      <th className="py-sm pr-md text-right font-normal">{T.colPosition}</th>
      <th className="py-sm pr-md text-left font-normal">{T.colLast}</th>
      <th className="py-sm pr-md text-right font-normal">{T.colCash}</th>
      <th className="py-sm pr-md text-center font-normal">{T.colInterval}</th>
      <th className="py-sm pr-md text-center font-normal">{T.colHardStop}</th>
      <th className="py-sm pr-md text-center font-normal">{T.colRead}</th>
      <th className="py-sm pr-md text-center font-normal">{T.colPaper}</th>
      <th className="py-sm pr-lg text-right font-normal" aria-label={T.colManage} />
    </motion.tr>
  );
}

export interface IntradayWatchTableProps {
  items: WatchItem[];
  /** 배치 시세(현재가·등락률) — 없으면 해당 셀 "—" (로딩 중이면 스켈레톤). */
  quotes: WatchlistQuote[];
  /**
   * 시세를 아직 불러오는 중인지 — 과거 그룹은 펼칠 때 지연로드하므로, 아직 없는 행에 "—" 대신
   * 스켈레톤을 보여주기 위한 신호. 미제공이면 없는 시세는 곧장 "—".
   */
  quotesLoading?: boolean;
  /** 행 식별자(`watchRowKey`) → 세션. 오늘 표는 ticker 키, 과거 표는 세션 id 키. */
  sessionByRowKey: Map<string, PaperTradingSession>;
  /**
   * 과거(히스토리) 표인지 — 행이 접혀 있으면 세션 상세를 조회하지 않는다.
   * 창 밖 과거 세션 상세는 Supabase 직독(틱 전량)이라, 그룹 하나가 N행이면 그만큼 판아웃된다.
   */
  historyMode?: boolean;
  /** 티커별 활성 매수 유의(경보·VI) — 빈 맵/미제공이면 칩 미표시(fail-soft). */
  warningsByTicker?: Record<string, StockWarningItem[]>;
  /**
   * 이 서버 운영자(operator) — 세션 소유자 배지 판정용. `session.owner === currentOperator` 면
   * "나" 배지, 다르면 상대 운영자 라벨(muted). 미제공/구 응답이면 배지 미표시(하위호환).
   */
  currentOperator?: string;
  /** 호가창을 볼 선택 종목(단일) — 행 클릭으로 전환. */
  selectedTicker?: string | null;
  onSelect?: (ticker: string) => void;
  /**
   * 그룹 펼침 제어(controlled) — 워크스페이스가 "펼친 과거 그룹만 시세 지연로드" 하려면 펼침 상태를
   * 상위에서 소유해야 한다. 셋(+토글/전체 콜백)을 넘기면 controlled, 미제공이면 표 내부 상태(기본
   * = 가장 최근 날짜만 펼침)로 동작한다(오늘 표는 그대로 uncontrolled).
   */
  expandedDateKeys?: ReadonlySet<string>;
  onToggleGroup?: (dateKey: string) => void;
  onSetAllGroups?: (expanded: boolean, dateKeys: string[]) => void;
  onStart: (
    stock: PaperTradingSelectedStock,
    initialCash: number,
    tickIntervalMinutes: number,
    positionHardStopPct: number | null,
  ) => Promise<PaperTradingSessionDetail>;
  onRemove: (ticker: string) => void;
}

export function IntradayWatchTable({
  items,
  quotes,
  quotesLoading = false,
  sessionByRowKey,
  historyMode = false,
  warningsByTicker,
  currentOperator,
  selectedTicker,
  onSelect,
  expandedDateKeys,
  onToggleGroup,
  onSetAllGroups,
  onStart,
  onRemove,
}: IntradayWatchTableProps) {
  // 오늘/어제 키(KST) — 그룹 라벨·기본 펼침 판정용. 마운트 1회 캡처(useState lazy init — 현재 시각은
  // 외부 가변값이라 렌더 중 직접 읽지 않는다). 자정 롤오버는 재방문/새로고침 시 갱신(허용).
  const [todayKey] = useState(() => kstDateKey(new Date().toISOString()) ?? "");
  const [yesterdayKey] = useState(
    () => kstDateKey(new Date(Date.now() - 86_400_000).toISOString()) ?? "",
  );

  // 세션 시작일 기준 날짜 그룹(최신 날짜 먼저). 세션 없는 워치 행(검색 추가)은 오늘 그룹으로.
  const groups = useMemo(
    () => groupWatchItemsByDate(items, sessionByRowKey, todayKey),
    [items, sessionByRowKey, todayKey],
  );

  // 그룹 펼침 — controlled(상위 소유) 이면 넘어온 셋/콜백을, 아니면 표 내부 상태를 쓴다.
  // 내부 기본은 **가장 최근 날짜 하나만** 펼침(그 외 접힘), 헤더 클릭으로 개별 토글.
  const controlled = expandedDateKeys !== undefined;
  const [expandOverride, setExpandOverride] = useState<Record<string, boolean>>({});
  const mostRecentKey = groups[0]?.dateKey;
  const isExpanded = (key: string) =>
    controlled
      ? expandedDateKeys.has(key)
      : (expandOverride[key] ?? key === mostRecentKey);
  const toggleGroup = (key: string) => {
    if (controlled) {
      onToggleGroup?.(key);
      return;
    }
    setExpandOverride((o) => ({ ...o, [key]: !isExpanded(key) }));
  };
  const setAllGroups = (expanded: boolean) => {
    if (controlled) {
      onSetAllGroups?.(expanded, groups.map((g) => g.dateKey));
      return;
    }
    setExpandOverride(Object.fromEntries(groups.map((g) => [g.dateKey, expanded])));
  };

  // 행 펼침 아코디언 — 표가 단일 소유(동시 1행). 행 내부 useState 였던 것을 승격해 펼침 패널의
  // 3초 폴링 중첩(N행×2본)을 구조적으로 1행×2본으로 상한(intraday-table-refactor).
  // 키는 ticker 가 아니라 행 식별자(`watchRowKey`) — 과거 표에서 같은 종목의 다른 날짜 행이
  // 함께 펼쳐지지 않게 한다.
  // 안정 콜백(useCallback + 함수형 업데이트) — memo 행의 props 동일성 유지.
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);
  const handleExpandChange = useCallback((rowKey: string, expanded: boolean) => {
    setExpandedRowKey((cur) => (expanded ? rowKey : cur === rowKey ? null : cur));
  }, []);

  return (
    <div className="flex flex-col">
      {/* 전체 접기/펼치기 — 날짜 그룹이 2개 이상일 때만. */}
      {groups.length > 1 && (
        <div className="flex items-center justify-end gap-md pb-sm text-caption">
          <button
            type="button"
            onClick={() => setAllGroups(true)}
            className="text-text-muted transition-colors hover:text-text-strong cursor-pointer"
          >
            {T.groupExpandAll}
          </button>
          <span className="text-border-line" aria-hidden>·</span>
          <button
            type="button"
            onClick={() => setAllGroups(false)}
            className="text-text-muted transition-colors hover:text-text-strong cursor-pointer"
          >
            {T.groupCollapseAll}
          </button>
        </div>
      )}
      {/* 카드 박스 제거 — 흰 바탕 위 헤어라인 표(홈 랭킹·보유종목 표 정합). 넓은 표라 가로 스크롤만 유지.
          전역 thead 없이 컬럼 헤더는 펼친 날짜 그룹 안에 각각 렌더한다(GroupColumnHeader). */}
      <div className="overflow-x-auto">
      <table className="w-full text-body-sm">
        <tbody>
          {groups.map((g) => {
            const expanded = isExpanded(g.dateKey);
            const label = groupLabel(g.dateKey, todayKey, yesterdayKey);
            const sum = daySummary(g.items, sessionByRowKey);
            return (
              <Fragment key={g.dateKey}>
                {/* 날짜 그룹 헤더 — colSpan 전폭. 좌=접기토글+라벨+건수 / 우=당일 요약(합산 수익률·승/패·진행). */}
                <tr className="border-b border-border-line bg-surface-muted/40">
                  <td colSpan={13} className="px-lg py-xs">
                    <button
                      type="button"
                      onClick={() => toggleGroup(g.dateKey)}
                      aria-expanded={expanded}
                      aria-label={T.groupToggleAria(label)}
                      className="flex w-full items-center gap-sm text-caption font-bold text-text-strong hover:text-accent-vivid transition-colors cursor-pointer"
                    >
                      <ChevronDown
                        size={14}
                        className={cn("shrink-0 transition-transform", !expanded && "-rotate-90")}
                        aria-hidden
                      />
                      <span>{label}</span>
                      <span className="font-normal text-text-muted">{T.groupCount(g.items.length)}</span>
                      {sum.sessions > 0 && (
                        <span className="ml-auto flex items-center gap-md pl-md font-normal tabular-nums">
                          <span
                            className={cn(
                              "font-bold",
                              sum.totalPnl > 0
                                ? "text-signal-up"
                                : sum.totalPnl < 0
                                  ? "text-signal-down"
                                  : "text-text-muted",
                            )}
                          >
                            {T.groupSummaryReturn} {sum.totalPnl > 0 ? "+" : ""}
                            {formatMoney(sum.totalPnl)}원
                            {sum.aggReturnPct != null && (
                              <>
                                {/* 괄호 기호만 muted — 금액·% 는 손익 색 유지(가독성 폴리시). */}
                                <span className="text-text-muted">(</span>
                                {formatPct(sum.aggReturnPct)}
                                <span className="text-text-muted">)</span>
                              </>
                            )}
                          </span>
                          {(sum.wins > 0 || sum.losses > 0) && (
                            <span className="text-text-muted">{T.groupWinLoss(sum.wins, sum.losses)}</span>
                          )}
                          {/* 실행 카운트 — 행 상태 필과 같은 녹색(실행=market-open 문법, intraday-session-status). */}
                          {sum.running > 0 && (
                            <span className="text-market-open">{T.groupRunning(sum.running)}</span>
                          )}
                        </span>
                      )}
                    </button>
                  </td>
                </tr>
                {expanded && <GroupColumnHeader />}
                {expanded &&
                  g.items.map((item) => (
                    <IntradayWatchRow
                      key={watchRowKey(item)}
                      item={item}
                      quote={quotes.find((q) => q.ticker === item.ticker) ?? null}
                      quotesLoading={quotesLoading}
                      session={sessionByRowKey.get(watchRowKey(item)) ?? null}
                      warnings={warningsByTicker?.[item.ticker]}
                      currentOperator={currentOperator}
                      selected={selectedTicker === item.ticker}
                      expanded={expandedRowKey === watchRowKey(item)}
                      historyMode={historyMode}
                      onExpandChange={handleExpandChange}
                      onSelect={onSelect}
                      onStart={onStart}
                      onRemove={onRemove}
                    />
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
