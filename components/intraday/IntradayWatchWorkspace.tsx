/**
 * IntradayWatchWorkspace — 단타 워치 워크스페이스 (B). intraday-scalping-agent §0 + intraday-paper-watch.
 *
 * 구조(피드백 반영): 최상단 단독 종목 검색(StockSearchPicker) → 추천 후보 카드(수급·거래량, 검색과
 * 분리) → 워치 **표**(IntradayWatchTable, 토스 랭킹 표 스타일 — 행 확장으로 판단/모의 단타 진입).
 * 화면이 열려 있는 동안 useIntradayPaperAutoTick 이 장중 5분 창 단위 자동 판단·가상 체결을 민다.
 * ⚠️ 의사결정 보조 — 자동 수익/집행 주장 없음, 실제 매매는 사람이 직접.
 */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/Badge";
import { Divider } from "@/components/ui/Divider";
import { useQueryFlowTop10 } from "@/hooks/flow/useQueryFlowTop10";
import { useQueryVolumeRank } from "@/hooks/market/useQueryVolumeRank";
import { useQueryWatchlist } from "@/hooks/watchlist/useQueryWatchlist";
import { useQueryStockWarningsBatch } from "@/hooks/stock/useQueryStockWarningsBatch";
import { StockWarningBadges } from "@/components/stock/StockWarningBadges";
import {
  filterPastSessions,
  useIntradayPaperWatch,
} from "@/hooks/intraday/useIntradayPaperWatch";
import { useIntradayPastSessions } from "@/hooks/intraday/useIntradayPastSessions";
import {
  IntradayWatchTable,
  groupWatchItemsByDate,
  watchRowKey,
  type WatchDateGroup,
  type WatchItem,
} from "@/components/intraday/IntradayWatchTable";
import { IntradayAutopilotCard } from "@/components/intraday/IntradayAutopilotCard";
import { IntradayCalibrationPanel } from "@/components/intraday/IntradayCalibrationPanel";
import { IntradayResearchAutopilotCard } from "@/components/intraday/IntradayResearchAutopilotCard";
import { BookOpenCheck, ChevronDown, Loader2, SlidersHorizontal } from "lucide-react";
import { StockSearchPicker } from "@/components/ui/StockSearchPicker";
import { todayKstDate } from "@/lib/api/toss/kst";
import { isKstMarketHoursWithCloseGrace } from "@/lib/utils/kstMarketHours";
import {
  INTRADAY_PAPER_COPY as P,
  INTRADAY_WATCH_COPY as W,
} from "@/lib/copy/stock/intradayRead";
import type { InvestorFlowRow } from "@/lib/types/flow/top10";
import type { PaperTradingSession } from "@/lib/types/paperTrading/paperTrading";
import type { StockWarningItem } from "@/lib/types/stock/warnings";

/** 과거 내역 섹션 카피 — 인라인 문구 금지(lib/copy SSOT). */
const PAST = P.past;

/**
 * 표 행 — 오늘 워치(rowKey 없음 = ticker 기준)와 과거 세션 행(rowKey = 세션 id)을 겸한다.
 * localStorage 에는 오늘 워치만 저장되고 rowKey 는 optional 이라 라운드트립에 영향 없음.
 */
export type Watch = WatchItem;

/** 티커별 활성 경보 맵(빈 맵이면 전부 미표시) — 배치 훅 결과 fail-soft 기본. */
type WarningsByTicker = Record<string, StockWarningItem[]>;

/** 추천 칩 1개 데이터 — 수급·거래량 소스 공통 최소 형태. */
type Candidate = { ticker: string; name: string; changePercent: number };

const MAX_CANDIDATES = 14;

function dedupCandidates(rows: InvestorFlowRow[]): InvestorFlowRow[] {
  const seen = new Set<string>();
  const out: InvestorFlowRow[] = [];
  for (const r of rows) {
    if (seen.has(r.ticker)) continue;
    seen.add(r.ticker);
    out.push(r);
    if (out.length >= MAX_CANDIDATES) break;
  }
  return out;
}

/** 워치 로컬 목록 localStorage 키 prefix — 날짜별로 분리해 매일 새 목록에서 시작한다. */
const WATCH_STORAGE_KEY_PREFIX = "finsight:intraday-watch";

export function intradayWatchStorageKey(dateKey: string): string {
  return `${WATCH_STORAGE_KEY_PREFIX}:${dateKey}`;
}

export function toggleWatchItem(items: Watch[], item: Watch): Watch[] {
  return items.some((x) => x.ticker === item.ticker)
    ? items.filter((x) => x.ticker !== item.ticker)
    : [...items, item];
}

function loadStoredWatch(storageKey: string): Watch[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is Watch =>
          !!x && typeof (x as Watch).ticker === "string" && typeof (x as Watch).name === "string",
      )
      .slice(0, 20);
  } catch {
    return [];
  }
}

function sessionWatch(session: PaperTradingSession): Watch {
  return {
    ticker: session.stocks[0]?.ticker ?? session.tickers[0] ?? "",
    name: session.stocks[0]?.name ?? session.tickers[0] ?? "종목",
  };
}

/**
 * 과거 세션 → 표 행. **세션 1건 = 1행**(행 식별자 = 세션 id).
 *
 * 예전에는 ticker 를 행 정체성으로 써서 같은 종목의 옛 날짜 세션이 통째로 삼켜졌다(종목당 최신 1건만
 * 남아 과거 날짜 그룹이 사라지던 원인). 날짜+티커 대신 세션 id 를 쓰는 이유는, 같은 날 같은 종목
 * 세션이 둘이면 날짜 그룹 합산 손익에서 한 건이 조용히 빠지기 때문이다.
 */
export function buildPastSessionRows(sessions: PaperTradingSession[]): {
  rows: Watch[];
  sessionByRowKey: Map<string, PaperTradingSession>;
} {
  const rows: Watch[] = [];
  const sessionByRowKey = new Map<string, PaperTradingSession>();
  for (const session of sessions) {
    const stock = sessionWatch(session);
    if (!stock.ticker || sessionByRowKey.has(session.id)) continue;
    rows.push({ ...stock, rowKey: session.id });
    sessionByRowKey.set(session.id, session);
  }
  return { rows, sessionByRowKey };
}

/**
 * 펼친 날짜 그룹들의 티커를 중복 없이(그룹 순서 보존) 모은다 — 과거 시세 지연로드 대상 계산용.
 * 접힌 그룹은 제외해 한 번에 부르는 티커 수를 오늘+펼친 과거로만 제한한다(30 soft cap 조용한 절단 방지).
 */
export function collectTickersForDateKeys(
  groups: WatchDateGroup[],
  expandedDateKeys: ReadonlySet<string>,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    if (!expandedDateKeys.has(group.dateKey)) continue;
    for (const item of group.items) {
      if (seen.has(item.ticker)) continue;
      seen.add(item.ticker);
      out.push(item.ticker);
    }
  }
  return out;
}

/**
 * "내 세션만" 필터 판정 — 다른 운영자가 소유한 세션 행인지(공유 Supabase 다중 서버).
 * 내 세션·소유자 미지정(레거시)·세션 없는 워치 행은 false(숨기지 않음). currentOperator 미상(구
 * 응답/미로드)이면 귀속 불가라 항상 false — 아무것도 숨기지 않아 하위호환을 지킨다.
 */
export function isForeignOwnedSession(
  session: PaperTradingSession | undefined,
  currentOperator: string | undefined,
): boolean {
  return !!session?.owner && !!currentOperator && session.owner !== currentOperator;
}

/** "내 세션만" 토글 상태 localStorage 키 — 날짜 무관 사용자 선호(워치 목록 키와 별개). */
const MINE_ONLY_STORAGE_KEY = "finsight:intraday-mine-only";

function loadMineOnly(): boolean {
  try {
    return window.localStorage.getItem(MINE_ONLY_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function IntradayWatchWorkspace() {
  const [watch, setWatch] = useState<Watch[]>([]);
  const [todayKey] = useState(() => todayKstDate());
  const storageKey = useMemo(() => intradayWatchStorageKey(todayKey), [todayKey]);
  // SSR 불일치 방지 — 마운트 후 localStorage 복원, 복원 전에는 저장하지 않는다.
  const [storageReady, setStorageReady] = useState(false);
  // "내 세션만" 필터 — 다른 서버 소유 세션 숨김. 기본 OFF. 사용자 선호라 localStorage 로 유지.
  const [mineOnly, setMineOnly] = useState(false);
  useEffect(() => {
    setWatch(loadStoredWatch(storageKey));
    setMineOnly(loadMineOnly());
    setStorageReady(true);
  }, [storageKey]);
  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(watch));
    } catch {
      /* 저장 실패는 무시(용량 등) */
    }
  }, [storageKey, watch, storageReady]);
  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(MINE_ONLY_STORAGE_KEY, mineOnly ? "1" : "0");
    } catch {
      /* 저장 실패는 무시 */
    }
  }, [mineOnly, storageReady]);

  const { data: flow, isLoading: flowLoading } = useQueryFlowTop10("today");
  const { data: volumeRank, isLoading: volumeLoading } = useQueryVolumeRank();
  const {
    sessionByTicker,
    todaySessionStocks,
    runningSessionIds,
    currentOperator,
    start,
  } = useIntradayPaperWatch();
  // 과거 내역은 인메모리 원장(최근 20건)이 아니라 Supabase 원장을 페이지 단위로 읽는다 —
  // "더 보기"로 과거 전체를 볼 수 있다(intraday-history-pagination).
  const pastHistory = useIntradayPastSessions();
  // 화면 갱신은 각 쿼리 훅의 refetchInterval 이 담당한다(intraday-live-refresh) — 세션 목록은
  // 실행 중 세션 유무와 무관하게 항상 폴링해야 새 세션(오토파일럿 스윕·타 서버)을 발견할 수 있다.
  // 15:40 이후엔 자동 완료 스윕 전까지 배지가 켜져 있던 것을 시각 게이트로 정리.
  const autoActive = runningSessionIds.length > 0 && isKstMarketHoursWithCloseGrace();

  // 표 행 = 오늘 로컬 워치 ∪ 오늘 cli-agent 세션. 이전 날짜 세션은 히스토리이지 오늘 구성 목록이
  // 아니므로 자동 편입하지 않는다. 다른 브라우저에서 오늘 시작한 세션만 이름순으로 뒤에 보존한다.
  const rows = useMemo(() => {
    const map = new Map<string, Watch>();
    for (const item of watch) map.set(item.ticker, item);
    const appended = todaySessionStocks
      .filter((stock) => !map.has(stock.ticker))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
    for (const stock of appended) map.set(stock.ticker, { ticker: stock.ticker, name: stock.name });
    return [...map.values()];
  }, [watch, todaySessionStocks]);

  // 오늘 제외는 서버가 이미 했다(startedBefore = 오늘 00:00 KST). 여기서 한 번 더 거르는 건
  // 자정 롤오버 방어용 — todayKey 는 마운트 시점 고정이라 자정을 넘겨 열어둔 화면에서 서버가
  // 새 "오늘"을 넘겨줄 수 있다. 이미 걸러진 목록이라 보통은 아무것도 제거하지 않는다.
  const pastSessions = useMemo(
    () => filterPastSessions(pastHistory.sessions, todayKey),
    [pastHistory.sessions, todayKey],
  );
  const pastView = useMemo(() => buildPastSessionRows(pastSessions), [pastSessions]);

  // "내 세션만" 대상이 있는지 — 다른 운영자 소유 세션이 하나라도 있을 때만 토글을 노출(단독 운영 시 무노출).
  const hasForeignSessions = useMemo(
    () =>
      rows.some((r) => isForeignOwnedSession(sessionByTicker.get(r.ticker), currentOperator)) ||
      pastView.rows.some((r) =>
        isForeignOwnedSession(pastView.sessionByRowKey.get(watchRowKey(r)), currentOperator),
      ),
    [rows, sessionByTicker, pastView, currentOperator],
  );

  // "내 세션만" 필터 적용 — 다른 운영자 소유 행만 제거(내 세션·미지정·세션없는 워치 행은 유지).
  // 표 items 뿐 아니라 과거 그룹핑·시세 지연로드도 같은 필터본을 써 숨긴 행 시세를 부르지 않는다.
  const visibleRows = useMemo(
    () =>
      mineOnly
        ? rows.filter(
            (r) => !isForeignOwnedSession(sessionByTicker.get(r.ticker), currentOperator),
          )
        : rows,
    [rows, mineOnly, sessionByTicker, currentOperator],
  );
  const visiblePastView = useMemo(() => {
    if (!mineOnly) return pastView;
    return {
      rows: pastView.rows.filter(
        (r) => !isForeignOwnedSession(pastView.sessionByRowKey.get(watchRowKey(r)), currentOperator),
      ),
      sessionByRowKey: pastView.sessionByRowKey,
    };
  }, [pastView, mineOnly, currentOperator]);

  const rowTickers = useMemo(() => rows.map((item) => item.ticker), [rows]);

  // 오늘 표 시세 — 항상 오늘 행만 조회(≤ soft cap 유지). 이전엔 오늘+과거 전체를 한 번에 넘겨
  // 30개 초과 시 route soft cap 이 뒤쪽을 조용히 잘라 일부 행이 "—" 로 떴다(근본 원인). 과거 시세는
  // 아래에서 **펼친 날짜 그룹만** 지연로드한다.
  const { data: todayQuotes = [], isLoading: todayQuotesLoading } =
    useQueryWatchlist(rowTickers);

  // 과거 표 — 세션 시작일(KST) 기준 날짜 그룹. 기본은 가장 최근 과거 날짜 하나만 펼침(표와 동일 규칙).
  // 펼침 상태를 여기서 소유해야 "펼친 그룹만 시세 조회" 를 계산할 수 있어 표를 controlled 로 쓴다.
  const pastGroups = useMemo(
    () => groupWatchItemsByDate(visiblePastView.rows, visiblePastView.sessionByRowKey, todayKey),
    [visiblePastView, todayKey],
  );
  const pastMostRecentKey = pastGroups[0]?.dateKey;
  const [pastExpandOverride, setPastExpandOverride] = useState<Record<string, boolean>>({});
  const expandedPastDateKeys = useMemo(() => {
    const set = new Set<string>();
    for (const group of pastGroups) {
      const expanded =
        pastExpandOverride[group.dateKey] ?? group.dateKey === pastMostRecentKey;
      if (expanded) set.add(group.dateKey);
    }
    return set;
  }, [pastGroups, pastExpandOverride, pastMostRecentKey]);
  const expandedPastTickers = useMemo(
    () => collectTickersForDateKeys(pastGroups, expandedPastDateKeys),
    [pastGroups, expandedPastDateKeys],
  );
  // 펼친 과거 그룹 시세만 별도 조회 — 그룹을 펼칠 때만 요청되고, 불러오는 동안 그 행들엔 스켈레톤.
  const { data: pastQuotes = [], isFetching: pastQuotesLoading } = useQueryWatchlist(
    expandedPastTickers,
    { enabled: expandedPastTickers.length > 0 },
  );
  const togglePastGroup = (dateKey: string) =>
    setPastExpandOverride((o) => ({
      ...o,
      [dateKey]: !(o[dateKey] ?? dateKey === pastMostRecentKey),
    }));
  const setAllPastGroups = (expanded: boolean, dateKeys: string[]) =>
    setPastExpandOverride(Object.fromEntries(dateKeys.map((k) => [k, expanded])));

  // 호가창을 볼 선택 종목(단일 — 다종목 동시 호가 폴링 금지, PRD q4). 행 클릭으로 전환하고,
  // 선택이 비었거나 목록에서 사라지면 첫 행으로 자동 수렴.
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  useEffect(() => {
    setSelectedTicker((prev) =>
      prev && rowTickers.includes(prev) ? prev : (rowTickers[0] ?? null),
    );
  }, [rowTickers]);

  const flowCandidates = dedupCandidates([...(flow?.foreign ?? []), ...(flow?.institution ?? [])]);
  const volumeCandidates = (volumeRank?.rows ?? []).slice(0, MAX_CANDIDATES);
  const watching = new Set(rowTickers);

  // 가시 티커(오늘 행 + 펼친 과거 그룹 + 추천 후보) union 으로 경보를 1회 배치 조회 — 티커별 칩에 내려준다.
  // 과거는 시세와 동일하게 펼친 그룹만 포함해 배치 크기를 줄인다(접힌 과거 행은 펼칠 때 편입).
  // 토스 키 없으면 빈 맵(fail-soft), 60s 캐시. 순서 무관 정규화는 훅 queryKey 가 담당.
  const warningTickers = useMemo(
    () => [
      ...new Set([
        ...rowTickers,
        ...expandedPastTickers,
        ...flowCandidates.map((c) => c.ticker),
        ...volumeCandidates.map((c) => c.ticker),
      ]),
    ],
    [rowTickers, expandedPastTickers, flowCandidates, volumeCandidates],
  );
  const { data: warningsData } = useQueryStockWarningsBatch(warningTickers);
  const warningsByTicker: WarningsByTicker = warningsData?.warnings ?? {};

  const add = (item: Watch) =>
    setWatch((prev) => (prev.some((x) => x.ticker === item.ticker) ? prev : [...prev, item]));
  const remove = (ticker: string) => setWatch((prev) => prev.filter((x) => x.ticker !== ticker));
  const toggle = (item: Watch) => setWatch((prev) => toggleWatchItem(prev, item));

  return (
    <div className="mx-auto w-full max-w-main-max-w flex flex-col gap-lg">
      {/* 문서 아웃라인용 접근성 제목(항상 sr-only) — 시각 타이틀은 전 페이지 공통으로 제거(홈 정합).
       *  장중 자동 판단 배지만 라이브 상태로 상단에 남긴다(active 일 때만). */}
      <h1 className="sr-only">{W.title}</h1>
      <div className="flex justify-end">
        <Link
          href="/intraday/mistake-note"
          className="button-secondary inline-flex items-center gap-xs"
        >
          <BookOpenCheck className="size-4" aria-hidden />
          AI 단타 오답노트
        </Link>
      </div>
      {/* 오늘 가이드 상품 — 시작·현재 행동·수행 원장이 첫 번째 시각 위계. */}
      <IntradayAutopilotCard />

      {/* 기본 펼침(사용자 지정) — 세션 표가 이 안에 있어 접혀 있으면 매번 열어야 했다.
          비제어 <details> 라 사용자가 접으면 접힌 채로 남는다: React 는 `open` prop 값이 바뀔 때만
          DOM 을 다시 쓰므로 폴링 재렌더가 접은 패널을 다시 열지 않는다. */}
      <details open className="group rounded-xl border border-border-line bg-surface-base">
        <summary className="flex cursor-pointer list-none items-center gap-sm p-lg text-body-md font-bold text-text-strong marker:hidden">
          <SlidersHorizontal className="size-5 text-text-muted" aria-hidden />
          직접 분석 도구
          <span className="hidden text-caption font-normal text-text-muted sm:inline">종목 검색·상세 모의투자</span>
          <ChevronDown className="ml-auto size-5 text-text-muted transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="flex flex-col gap-lg border-t border-border-line p-lg">
          <IntradayResearchAutopilotCard />
          {autoActive || hasForeignSessions ? (
            <div className="flex items-center gap-md">
              {autoActive ? <Badge variant="info">{P.autoTicking}</Badge> : null}
              {/* 공유 Supabase 다중 서버일 때만 노출 — 다른 서버 소유 세션 숨김 토글. */}
              {hasForeignSessions ? (
                <button
                  type="button"
                  onClick={() => setMineOnly((v) => !v)}
                  aria-pressed={mineOnly}
                  title={P.owner.mineOnlyHint}
                  className={cn(
                    "ml-auto inline-flex items-center gap-xs rounded-pill border px-sm py-xs text-caption transition-colors cursor-pointer",
                    mineOnly
                      ? "border-accent-vivid bg-accent-soft text-accent-vivid"
                      : "border-border-line text-text-muted hover:bg-surface-muted",
                  )}
                >
                  {P.owner.mineOnly}
                </button>
              ) : null}
            </div>
          ) : null}

      {/* 종목 검색 — 추천 UI 와 분리해 최상단 단독 배치(피드백). */}
      <StockSearchPicker
        placeholder={W.searchPlaceholder}
        onSelect={(stock) => add({ ticker: stock.ticker, name: stock.name })}
      />

      {/* 추천 후보 — 수급 상위 + 거래량 상위. 카드 박스 대신 흰 바탕 위 헤어라인 구분(카드리스). */}
      <section className="flex flex-col gap-md" aria-label={W.recommendTitle}>
        <CandidateChips
          title={W.flowTitle}
          hint={W.flowHint}
          isLoading={flowLoading}
          candidates={flowCandidates}
          watching={watching}
          warningsByTicker={warningsByTicker}
          onToggle={toggle}
        />
        <Divider />
        <CandidateChips
          title={W.volumeTitle}
          hint={W.volumeHint}
          isLoading={volumeLoading}
          candidates={volumeCandidates}
          watching={watching}
          warningsByTicker={warningsByTicker}
          onToggle={toggle}
        />
      </section>

      {/* 워치 표 — 오늘 구성 목록과 오늘 세션만 표시한다. 공통 안내는 표 위 한 곳에. */}
      {rows.length === 0 ? (
        <p className="py-md text-body-sm text-text-muted">{W.empty}</p>
      ) : (
        <>
          {/* 동작·매매 규칙·면책 — 카드 대신 은은한 surface-muted 노트(가벼운 캡션 톤). */}
          <div className="flex flex-col gap-xs rounded-md bg-surface-muted px-md py-sm text-caption text-text-muted">
            {P.noticeLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          {/* 워치 표 — 행 펼침 시 차트 탭 아래에 호가창(좌)·체결강도(우)가 함께 뜬다(IntradayWatchTable).
              이전엔 표 옆/아래 도킹이라 좁은 창서 표가 밀렸다(사용자 지적) → 펼침 내부로 이동. */}
          <IntradayWatchTable
            items={visibleRows}
            quotes={todayQuotes}
            quotesLoading={todayQuotesLoading}
            sessionByRowKey={sessionByTicker}
            warningsByTicker={warningsByTicker}
            currentOperator={currentOperator}
            selectedTicker={selectedTicker}
            onSelect={setSelectedTicker}
            onStart={start}
            onRemove={remove}
          />
        </>
      )}

      {/* 과거 모의투자 내역 — Supabase 원장 페이지네이션. 첫 페이지가 비어도 "저장소 꺼짐"·에러는
          구분해 알린다(빈 내역으로 위장하지 않음). 더 보기로 들어온 날짜 그룹은 접힌 채 도착하므로
          시세·경보·상세 요청이 페이징만으로는 늘지 않는다. */}
      <section className="flex flex-col gap-sm" aria-label={PAST.title}>
        <div className="flex items-baseline justify-between gap-md">
          <h2 className="text-body-md font-bold text-text-strong">{PAST.title}</h2>
          <span className="text-caption text-text-muted">{PAST.hint}</span>
        </div>

        {pastHistory.isLoading ? (
          <p className="text-caption text-text-muted">{PAST.loading}</p>
        ) : null}

        {pastHistory.isError ? (
          <div className="flex items-center gap-sm">
            <p className="text-caption text-signal-down" role="alert">
              {PAST.error}
            </p>
            <button
              type="button"
              onClick={pastHistory.retry}
              className="text-caption text-accent-vivid transition-colors hover:text-text-strong cursor-pointer"
            >
              {PAST.retry}
            </button>
          </div>
        ) : null}

        {!pastHistory.isLoading && !pastHistory.isError && visiblePastView.rows.length === 0 ? (
          <p className="text-caption text-text-muted">
            {pastHistory.configured ? PAST.empty : PAST.disabled}
          </p>
        ) : null}

        {visiblePastView.rows.length > 0 ? (
          <IntradayWatchTable
            items={visiblePastView.rows}
            quotes={pastQuotes}
            quotesLoading={pastQuotesLoading}
            sessionByRowKey={visiblePastView.sessionByRowKey}
            historyMode
            warningsByTicker={warningsByTicker}
            currentOperator={currentOperator}
            expandedDateKeys={expandedPastDateKeys}
            onToggleGroup={togglePastGroup}
            onSetAllGroups={setAllPastGroups}
            onStart={start}
            onRemove={() => undefined}
          />
        ) : null}

        {/* 더 보기 — 렌더된 행 수와 무관하게 hasMore 면 노출한다("내 세션만" 이 한 페이지를 통째로
            걸러내도 다음 페이지로 넘어갈 수 있어야 한다). */}
        {pastHistory.hasMore && !pastHistory.isError ? (
          <button
            type="button"
            onClick={pastHistory.loadMore}
            disabled={pastHistory.isLoadingMore}
            className="button-secondary self-center inline-flex items-center gap-xs"
          >
            {pastHistory.isLoadingMore ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {PAST.loadingMore}
              </>
            ) : (
              PAST.more
            )}
          </button>
        ) : null}

        {!pastHistory.hasMore && !pastHistory.isError && visiblePastView.rows.length > 0 ? (
          <p className="self-center text-caption text-text-muted">{PAST.end}</p>
        ) : null}
      </section>

      {/* 판단 캘리브레이션(관리자) — 틱 자가채점 라벨 요약·백필 실행. 노출 규칙은 페이지와 동일. */}
      <IntradayCalibrationPanel />
        </div>
      </details>
    </div>
  );
}

/** 추천 후보 칩 행 — 수급/거래량 공통 렌더(이미 워치면 비활성). */
function CandidateChips({
  title,
  hint,
  isLoading,
  candidates,
  watching,
  warningsByTicker,
  onToggle,
}: {
  title: string;
  hint: string;
  isLoading: boolean;
  candidates: Candidate[];
  watching: Set<string>;
  warningsByTicker: WarningsByTicker;
  onToggle: (item: Watch) => void;
}) {
  return (
    <div className="flex flex-col gap-xs" aria-label={title}>
      <div className="flex items-baseline gap-sm">
        <h2 className="text-body-md font-bold text-text-strong">{title}</h2>
        <span className="text-caption text-text-muted">{hint}</span>
      </div>
      {isLoading ? (
        <div className="text-body-sm text-text-muted">{W.candidatesLoading}</div>
      ) : candidates.length === 0 ? (
        <div className="text-body-sm text-text-muted">{W.candidatesEmpty}</div>
      ) : (
        <div className="flex flex-wrap gap-xs">
          {candidates.map((c) => (
            <button
              key={c.ticker}
              type="button"
              onClick={() => onToggle({ ticker: c.ticker, name: c.name })}
              aria-pressed={watching.has(c.ticker)}
              className={cn(
                "inline-flex items-center gap-xs text-caption px-sm py-xs rounded-pill border border-border-line transition-colors cursor-pointer",
                watching.has(c.ticker)
                  ? "border-accent-vivid bg-accent-soft text-accent-vivid hover:bg-surface-muted"
                  : "hover:bg-surface-muted",
              )}
            >
              <span className="text-text-strong">{c.name}</span>
              <span
                className={cn(
                  "tabular-nums",
                  c.changePercent > 0
                    ? "text-signal-up"
                    : c.changePercent < 0
                      ? "text-signal-down"
                      : "text-text-muted",
                )}
              >
                {c.changePercent >= 0 ? "+" : ""}
                {c.changePercent.toFixed(1)}%
              </span>
              {/* 좁은 칩이라 최상위 심각도 1개만 병기(단기과열/투자경고 구분이 픽 결정에 유효). */}
              <StockWarningBadges warnings={warningsByTicker[c.ticker]} max={1} size="sm" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
