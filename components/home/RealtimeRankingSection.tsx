/**
 * RealtimeRankingSection — 홈 "실시간" 랭킹(카드리스 플랫 표), **가용성 기반** 렌더.
 *
 * home-reskin 신규 · `market-status-aware-home` 가용성 개정 · `ranking-columns` 컬럼/옵션 확장.
 * 박스 없는 흰 바탕 표 + 헤더 컬럼 행: [♥][순위][로고닷+종목명+경고배지][산업][현재가][등락률][시총].
 * 산업·시총은 md+ 에서만(모바일 숨김). 경고 배지·위험숨기기 토글은 클라 warnings 배치 재사용. 행 헤어라인만.
 *
 * 탭(거래량/거래대금/급상승/급하락) **4종 모두 실배선 + 항상 프로브**:
 *   - 거래량   → `useQueryVolumeRank("volume")`
 *   - 거래대금 → `useQueryVolumeRank("value")`
 *   - 급상승   → `useQueryFluctuation("up")`
 *   - 급하락   → `useQueryFluctuation("down")`
 *   4개 훅을 모두 `enabled`(가용성을 알려면 활성 탭만이 아니라 전 탭 조회 필요, PRD §3-1). KIS 레이트리밋
 *   (EGW00201)은 훅 staleTime 60s 캐시(§8 q2)로 반복 마운트를 흡수한다.
 *
 * **가용성 판정(§6, `resolveAvailability`)**: 각 탭 결과에서
 *   - available   = `isError=false` AND `dataSource ∈ {kis, mock}` (dev mock 정상 표시)
 *   - unavailable = `isError=true`(502) OR `dataSource ∈ {mock-timeout, mock-empty, mock-error}`
 *   - loading     = 첫 프로브 진행 중
 * **렌더**:
 *   - available 탭만 탭바에 노출(unavailable 탭은 **DOM 제거** — 흐림 아님). 남은 탭 좌측 정렬.
 *   - 활성 탭이 unavailable 로 바뀌면 첫 available 탭으로 자동 이동(빈 콘텐츠 방지).
 *   - available 탭이 1개뿐이면 탭바 → 정적 소제목 라벨로 강등(어포던스 제거).
 *   - 전탭 unavailable(0개) → `MaintenanceNotice`(중립 점검 안내, 관리자만 "다시 시도").
 *   ★ 시각(장 열림/닫힘) 게이팅은 폐기(초판 `isRegularOpen` 하드 게이팅 정정) — 주말·장외 정상 랭킹 노출.
 *
 * 데이터: 시총·산업은 서버 enrich(best-effort, 미확보 시 fail-soft 빈칸). 색은 부호(상승=빨강/하락=파랑).
 * 행 클릭 → `/stock/[ticker]`. hover/focus·롱프레스 시 `useStockPeek` 로 상세 선반입 + 차트 Peek.
 *
 * 컨벤션(`docs/rules/frontend.md` §1·§2): useQuery 직접 import 금지 → 도메인 훅만 소비.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { ListRow } from "@/components/ui/ListRow";
import { Skeleton } from "@/components/ui/Skeleton";
import { MaintenanceNotice } from "@/components/market/MaintenanceNotice";
import { StockWarningBadges } from "@/components/stock/StockWarningBadges";
import { useQueryVolumeRank } from "@/hooks/market/useQueryVolumeRank";
import { useQueryFluctuation } from "@/hooks/market/useQueryFluctuation";
import { useQueryStockWarningsBatch } from "@/hooks/stock/useQueryStockWarningsBatch";
import { useMe } from "@/hooks/auth/useMe";
import { useStockPeek } from "@/hooks/stock/useStockPeek";
import { useWatchlistTickers } from "@/hooks/watchlist/useWatchlistTickers";
import { useBreakpoint } from "@/hooks/utils/useBreakpoint";
import { resolveAvailability, type Availability } from "@/lib/market/availability";
import {
  deriveRankingView,
  type RankingViewState,
} from "@/lib/market/rankingView";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatMoney";
import { formatMarketCap, formatWonCompact } from "@/lib/utils/formatMarketCap";
import { formatShareVolume } from "@/lib/utils/formatShareVolume";
import { formatPct } from "@/lib/utils/formatPct";
import { stockDetailPath } from "@/lib/utils/stockDetailPath";
import { rankLogoDotClass, rankLogoInitial } from "@/lib/utils/rankLogoDot";
import { warningSeverity } from "@/lib/copy/stock/warnings";
import type { FlowDirection } from "@/lib/types/flow/top10";
import type { StockWarningItem } from "@/lib/types/stock/warnings";
import {
  RANK_SECTION_TITLE,
  RANK_TAB_VOLUME,
  RANK_TAB_TURNOVER,
  RANK_TAB_SURGE,
  RANK_TAB_PLUNGE,
  RANK_LOADING,
  RANK_EMPTY,
  RANK_CAPTION_VOLUME,
  RANK_CAPTION_TURNOVER,
  RANK_CAPTION_SURGE,
  RANK_CAPTION_PLUNGE,
  RANK_FAVORITE_ADD,
  RANK_FAVORITE_REMOVE,
  RANK_COL_RANK,
  RANK_COL_STOCK,
  RANK_COL_SECTOR,
  RANK_COL_PRICE,
  RANK_COL_CHANGE,
  RANK_COL_MARKETCAP,
  RANK_COL_VOLUME,
  RANK_COL_TURNOVER,
  RANK_RISK_HIDE_LABEL,
  RANK_RISK_ALL_HIDDEN,
} from "@/lib/copy/home/marketOverview";

/**
 * 헤더-바디 공유 grid 트랙 — 컬럼 폭 토큰(col-sector·col-value·col-marketcap)으로 정합 고정(hex/px 직타 없음).
 *   - 모바일(< md): ♥·순위·종목·현재가·등락률(5트랙). 산업·값·시총 셀은 `hidden md:*` → 트랙 미점유.
 *   - md+: 종목 뒤 산업, 등락률 뒤 [값(탭별)]·시총 add.
 * 순위 셀 폭(1.25rem)·등락률 폭(4rem)·현재가 폭(5.5rem)은 구조 rem(토큰 대상 아님, 기존 관례).
 *
 * ★ 두 변형을 **완전한 리터럴**로 둔다 — Tailwind JIT 는 소스에서 통짜 클래스 문자열만 생성하므로
 *   런타임 조합(`grid-cols-[${x}]`)은 CSS 미방출로 깨진다. `hasValue` 로 리터럴을 고른다(동적 조합 금지).
 */
const RANK_GRID_BASE =
  "grid items-center gap-md grid-cols-[1.5rem_1.25rem_1fr_5.5rem_4rem] md:grid-cols-[1.5rem_1.25rem_1fr_theme(spacing.col-sector)_5.5rem_4rem_theme(spacing.col-marketcap)]";
/** 값 컬럼(거래량/거래대금 탭)이 있는 md+ 변형 — 등락률과 시총 사이 col-value 트랙 삽입. */
const RANK_GRID_WITH_VALUE =
  "grid items-center gap-md grid-cols-[1.5rem_1.25rem_1fr_5.5rem_4rem] md:grid-cols-[1.5rem_1.25rem_1fr_theme(spacing.col-sector)_5.5rem_4rem_theme(spacing.col-value)_theme(spacing.col-marketcap)]";

/** 활성 탭에 값 컬럼이 있으면 그 트랙 포함 grid, 아니면 기본 grid. */
function rankGridClass(hasValue: boolean): string {
  return hasValue ? RANK_GRID_WITH_VALUE : RANK_GRID_BASE;
}

/** 컬럼 헤더 라벨 톤 — 토스톤 muted 캡션(col-header 12px/600). */
const COL_HEADER = "truncate text-caption font-semibold text-text-muted";

/** 위험군 판정 — severity critical(정리매매·투자위험) + warn(투자경고·단기과열). PRD §6-3. */
function isRiskWarnings(items: readonly StockWarningItem[] | undefined): boolean {
  if (!items || items.length === 0) return false;
  return items.some((w) => {
    const s = warningSeverity(w.warningType);
    return s === "critical" || s === "warn";
  });
}

/** 랭킹 기준 탭 — 4종 모두 실배선. */
type RankTab = "volume" | "turnover" | "surge" | "plunge";

type RankTabDef = { value: RankTab; label: string };

const RANK_TABS: ReadonlyArray<RankTabDef> = [
  { value: "volume", label: RANK_TAB_VOLUME },
  { value: "turnover", label: RANK_TAB_TURNOVER },
  { value: "surge", label: RANK_TAB_SURGE },
  { value: "plunge", label: RANK_TAB_PLUNGE },
];

/** 가용성 파생용 탭 순서(좌측 정렬 기준). */
const RANK_TABS_ORDER: ReadonlyArray<RankTab> = RANK_TABS.map((t) => t.value);

/** 활성 탭별 기준 캡션 — 무엇으로 줄 세운 순위인지 명시. */
const RANK_CAPTIONS: Record<RankTab, string> = {
  volume: RANK_CAPTION_VOLUME,
  turnover: RANK_CAPTION_TURNOVER,
  surge: RANK_CAPTION_SURGE,
  plunge: RANK_CAPTION_PLUNGE,
};

/**
 * 네 탭 공통 표시 골격 — 거래량/거래대금(`VolumeRankRow`)·급상승/급하락(`FluctuationRow`) 교집합.
 * 시총·산업은 서버 enrich(`ranking-columns`)로 실려 온다 — 미확보 시 null/미설정(fail-soft).
 */
type RankableRow = {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
  direction: FlowDirection;
  sector?: string;
  marketCap?: number | null;
  /** 누적 거래량(주) — 거래량/거래대금 탭(`VolumeRankRow`)만 보유. 급상승/급하락은 미보유. */
  volume?: number;
  /** 누적 거래대금(원) — 거래량/거래대금 탭만 보유(응답에 있으면 매핑). */
  tradingValue?: number | null;
};

/**
 * 활성 탭의 "값" 컬럼 정의 — 탭이 정렬 기준으로 삼는 값을 md+ 에 노출.
 *   - 거래량 탭   → 거래량(주)
 *   - 거래대금 탭 → 거래대금(원)
 *   - 급상승/급하락 → null(정렬 기준인 등락률이 이미 본체 컬럼 → 값 컬럼 없음)
 */
type ValueColumn = { label: string; format: (row: RankableRow) => string };

function valueColumnForTab(tab: RankTab | undefined): ValueColumn | null {
  if (tab === "volume") {
    return { label: RANK_COL_VOLUME, format: (r) => formatShareVolume(r.volume) };
  }
  if (tab === "turnover") {
    return {
      label: RANK_COL_TURNOVER,
      format: (r) => formatWonCompact(r.tradingValue),
    };
  }
  return null;
}

/** 등락 방향 → 등락률 색 토큰(합성 클래스라 cn 사이즈 override 시에도 색 유지). */
function changeClass(direction: FlowDirection): string {
  if (direction === "up") return "signal-up-text";
  if (direction === "down") return "signal-down-text";
  return "text-text-muted text-mono-numeric tabular-nums";
}

export function RealtimeRankingSection() {
  const [tab, setTab] = useState<RankTab>("volume");
  // 위험종목 숨기기 — 기본 off(opt-in). 켜면 severity critical+warn 행을 리스트에서 필터(추가 fetch 0).
  const [riskHidden, setRiskHidden] = useState(false);

  // 4개 랭킹 훅을 **모두 프로브**(가용성 판정에 전 탭 필요). staleTime 60s 캐시가 반복 마운트/레이트리밋 흡수.
  const volumeQuery = useQueryVolumeRank("volume");
  const turnoverQuery = useQueryVolumeRank("value");
  const surgeQuery = useQueryFluctuation("up");
  const plungeQuery = useQueryFluctuation("down");

  // ★ 관심종목 훅은 섹션에서 **단일 인스턴스**로 소유한다(행마다 호출 시 서로의 추가를 덮어씀).
  const { hasTicker, addTicker, removeTicker } = useWatchlistTickers();

  // 관리자만 점검 안내에서 "다시 시도"를 본다(표시용 — 재시도는 공개 refetch).
  const { isAdmin } = useMe();

  const queryByTab = {
    volume: volumeQuery,
    turnover: turnoverQuery,
    surge: surgeQuery,
    plunge: plungeQuery,
  } as const;

  // 탭별 가용성(loading/available/unavailable) → 순수 파생(노출 탭·활성 탭 이동·뷰 상태).
  const availabilityByTab: Record<RankTab, Availability> = {
    volume: resolveAvailability(volumeQuery),
    turnover: resolveAvailability(turnoverQuery),
    surge: resolveAvailability(surgeQuery),
    plunge: resolveAvailability(plungeQuery),
  };
  const { effectiveTab, view } = deriveRankingView(
    RANK_TABS_ORDER,
    availabilityByTab,
    tab,
  );
  const availableTabDefs = RANK_TABS.filter(
    (t) => availabilityByTab[t.value] === "available",
  );

  // ★ 경고 배치 — 활성(effective) 탭 가시 행 티커 union 을 섹션 단일 인스턴스로 1회 조회(행마다 호출 금지).
  //   fail-soft 빈 맵(토스 미설정/실패)·장중 60s 갱신. 위험숨기기 필터도 이 데이터를 재사용(추가 fetch 0).
  const activeQuery = effectiveTab ? queryByTab[effectiveTab] : null;
  const activeRows: RankableRow[] = activeQuery?.data?.rows ?? [];
  const warningsQuery = useQueryStockWarningsBatch(
    activeRows.map((row) => row.ticker),
  );
  const warningsByTicker = warningsQuery.data?.warnings ?? {};

  // 활성 탭이 available 목록에서 빠지면(초기·소실) 첫 available 로 이동(빈 콘텐츠 방지). 그 외 클릭 존중.
  useEffect(() => {
    if (effectiveTab && effectiveTab !== tab) setTab(effectiveTab);
  }, [effectiveTab, tab]);

  const retryAll = () => {
    volumeQuery.refetch();
    turnoverQuery.refetch();
    surgeQuery.refetch();
    plungeQuery.refetch();
  };

  const hasTabBar = availableTabDefs.length >= 2;
  const singleLabel =
    availableTabDefs.length === 1 ? availableTabDefs[0].label : null;
  const toggleRisk = () => setRiskHidden((v) => !v);

  return (
    <Section
      title={RANK_SECTION_TITLE}
      action={
        view === "list" ? (
          <div className="hidden items-center gap-sm sm:flex">
            {hasTabBar && (
              <RankTabs
                tabs={availableTabDefs}
                value={effectiveTab ?? availableTabDefs[0].value}
                onChange={setTab}
              />
            )}
            <RiskHideToggle active={riskHidden} onToggle={toggleRisk} />
          </div>
        ) : undefined
      }
    >
      {/* 모바일 — 탭 + 위험숨기기 토글을 제목줄 아래 한 줄에(액션 슬롯이 좁음). */}
      {view === "list" && (
        <div className="flex items-center justify-between gap-sm sm:hidden">
          {hasTabBar ? (
            <RankTabs
              tabs={availableTabDefs}
              value={effectiveTab ?? availableTabDefs[0].value}
              onChange={setTab}
              className="inline-flex"
            />
          ) : (
            <span aria-hidden="true" />
          )}
          <RiskHideToggle active={riskHidden} onToggle={toggleRisk} />
        </div>
      )}

      {/* available 탭이 1개뿐 — 정적 소제목 라벨로 강등(비인터랙티브). */}
      {singleLabel && (
        <p className="self-start text-body-sm-strong text-text-strong">
          {singleLabel}
        </p>
      )}

      <RankingContent
        view={view}
        activeQuery={effectiveTab ? queryByTab[effectiveTab] : null}
        activeTab={effectiveTab}
        valueColumn={valueColumnForTab(effectiveTab)}
        isAdmin={isAdmin}
        onRetry={retryAll}
        hasTicker={hasTicker}
        addTicker={addTicker}
        removeTicker={removeTicker}
        warningsByTicker={warningsByTicker}
        riskHidden={riskHidden}
      />
    </Section>
  );
}

/** 콘텐츠 영역 — 로딩/점검/리스트 3-상태 분기(탭바·헤더는 상위가 소유). */
function RankingContent({
  view,
  activeQuery,
  activeTab,
  valueColumn,
  isAdmin,
  onRetry,
  hasTicker,
  addTicker,
  removeTicker,
  warningsByTicker,
  riskHidden,
}: {
  view: RankingViewState;
  activeQuery:
    | { data?: { rows: RankableRow[] } | undefined; isLoading: boolean }
    | null;
  activeTab: RankTab | undefined;
  valueColumn: ValueColumn | null;
  isAdmin: boolean;
  onRetry: () => void;
  hasTicker: (ticker: string) => boolean;
  addTicker: (ticker: string, name: string) => void;
  removeTicker: (ticker: string) => void;
  warningsByTicker: Record<string, StockWarningItem[]>;
  riskHidden: boolean;
}) {
  // 배지 max 분기(md=2/모바일=1)만 JS 반응형. 컬럼 표시/숨김은 Tailwind `md:` 유틸.
  const { isMobile } = useBreakpoint();

  if (view === "loading") return <RankSkeleton />;
  if (view === "maintenance") {
    return <MaintenanceNotice isAdmin={isAdmin} onRetry={onRetry} />;
  }

  // view === "list" — 활성(effective) 탭 리스트. 활성 탭은 available 이라 에러 상태가 아니다.
  if (!activeQuery || activeQuery.isLoading) return <RankSkeleton />;

  const rows: RankableRow[] = activeQuery.data?.rows ?? [];
  if (rows.length === 0) {
    return <p className="py-md text-body-sm text-text-muted">{RANK_EMPTY}</p>;
  }

  // 위험숨기기 on → 위험군(critical+warn) 행 필터(경고 배치 데이터 재사용, 추가 fetch 0).
  const visibleRows = riskHidden
    ? rows.filter((row) => !isRiskWarnings(warningsByTicker[row.ticker]))
    : rows;

  return (
    <>
      <RankHeaderRow valueColumn={valueColumn} />
      {visibleRows.length === 0 ? (
        // 전량 위험군 필터 → 빈 상태(헤더·토글 유지, off 로 복원). 원래 순번을 위해 rows index 사용.
        <p className="py-lg text-center text-body-sm text-text-muted">
          {RANK_RISK_ALL_HIDDEN}
        </p>
      ) : (
        <div role="list">
          {visibleRows.map((row) => (
            <RankRow
              key={row.ticker}
              row={row}
              rank={rows.indexOf(row) + 1}
              valueColumn={valueColumn}
              warnings={warningsByTicker[row.ticker]}
              badgeMax={isMobile ? 1 : 2}
              favorited={hasTicker(row.ticker)}
              onToggleFavorite={() =>
                hasTicker(row.ticker)
                  ? removeTicker(row.ticker)
                  : addTicker(row.ticker, row.name)
              }
            />
          ))}
        </div>
      )}
      {/* 기준 각주 — 활성 탭 기준을 명시. */}
      {activeTab && (
        <p className="text-caption text-text-muted">{RANK_CAPTIONS[activeTab]}</p>
      )}
    </>
  );
}

/** 헤더 컬럼 행 — 바디 행과 동일 grid 트랙 공유(정렬 강제). 산업·값·시총 라벨은 md+ 에서만. */
function RankHeaderRow({ valueColumn }: { valueColumn: ValueColumn | null }) {
  return (
    <div
      className={cn(
        "-mx-sm border-b border-border-line px-sm h-header-row-h",
        rankGridClass(valueColumn !== null),
      )}
    >
      {/* ♥ + 순위 트랙 묶어 라벨(♥ 트랙은 라벨 없음). */}
      <span className={cn(COL_HEADER, "col-span-2 text-center")}>
        {RANK_COL_RANK}
      </span>
      <span className={COL_HEADER}>{RANK_COL_STOCK}</span>
      <span className={cn(COL_HEADER, "hidden md:block")}>{RANK_COL_SECTOR}</span>
      <span className={cn(COL_HEADER, "text-right")}>{RANK_COL_PRICE}</span>
      <span className={cn(COL_HEADER, "text-right")}>{RANK_COL_CHANGE}</span>
      {/* 값(거래량/거래대금) — 값 컬럼 있는 탭만, md+. 트랙 순서상 등락률과 시총 사이. */}
      {valueColumn && (
        <span className={cn(COL_HEADER, "hidden text-right md:block")}>
          {valueColumn.label}
        </span>
      )}
      <span className={cn(COL_HEADER, "hidden text-right md:block")}>
        {RANK_COL_MARKETCAP}
      </span>
    </div>
  );
}

/** 위험종목 숨기기 토글 — off=흰+muted / on=accent-soft+primary pill(RankTabs 형제 톤). */
function RiskHideToggle({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "h-button-sm-h shrink-0 cursor-pointer rounded-pill px-md text-button-sm transition-colors",
        active
          ? "bg-accent-soft text-primary"
          : "text-text-muted hover:text-text-strong",
      )}
      onClick={onToggle}
    >
      {RANK_RISK_HIDE_LABEL}
    </button>
  );
}

/**
 * 거래량/거래대금/급상승/급하락 세그먼트 — ModeToggle 과 동일 시각 언어(pill + 흰 활성).
 * available 탭만 렌더(unavailable 은 상위가 목록에서 제외 — DOM 제거). 흐림/재시도 힌트 없음.
 */
function RankTabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: ReadonlyArray<RankTabDef>;
  value: RankTab;
  onChange: (tab: RankTab) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={RANK_SECTION_TITLE}
      className={cn(
        "items-center gap-xs rounded-pill bg-surface-muted p-xs",
        className,
      )}
    >
      {tabs.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={cn(
              "h-button-sm-h cursor-pointer rounded-pill px-md text-button-sm transition-colors",
              isActive
                ? "bg-surface text-text-strong shadow-sm"
                : "text-text-muted hover:text-text-strong",
            )}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** 랭킹 1행 — 카드리스 플랫 행(ListRow 헤어라인). 관심종목 state 는 상위(섹션)가 단일 소유. */
function RankRow({
  row,
  rank,
  valueColumn,
  warnings,
  badgeMax,
  favorited,
  onToggleFavorite,
}: {
  row: RankableRow;
  rank: number;
  valueColumn: ValueColumn | null;
  warnings: StockWarningItem[] | undefined;
  /** 배지 상한 — md=2 / 모바일=1(최상위 심각도). */
  badgeMax: number;
  favorited: boolean;
  onToggleFavorite: () => void;
}) {
  const router = useRouter();
  const { peekProps, prefetch } = useStockPeek({
    ticker: row.ticker,
    name: row.name,
    seed: {
      price: row.price,
      changePercent: row.changePercent,
      direction: row.direction,
    },
  });

  const go = () => {
    prefetch(row.ticker);
    router.push(stockDetailPath(row.ticker, row.name));
  };

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite();
  };

  const hasBadges = (warnings?.length ?? 0) > 0;

  return (
    <ListRow
      role="listitem"
      tabIndex={0}
      aria-label={`${row.name} 상세 보기`}
      className={cn(
        "-mx-sm cursor-pointer rounded-sm px-sm transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none",
        rankGridClass(valueColumn !== null),
      )}
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      }}
      {...peekProps}
    >
      {/* ♥ 관심종목 토글 */}
      <button
        type="button"
        aria-pressed={favorited}
        aria-label={favorited ? RANK_FAVORITE_REMOVE : RANK_FAVORITE_ADD}
        className="inline-grid h-6 w-6 place-items-center rounded-sm text-text-muted transition-colors hover:text-signal-up"
        onClick={toggleFavorite}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Heart
          className={cn("h-4 w-4", favorited && "fill-current text-signal-up")}
          aria-hidden="true"
        />
      </button>

      {/* 순위 */}
      <span className="text-center text-caption font-bold tabular-nums text-text-muted">
        {rank}
      </span>

      {/* 로고닷 + 종목명(코드 미표시) + 경고 배지(md=인라인 / 모바일=아래 줄바꿈) */}
      <div className="flex min-w-0 flex-col gap-xs md:flex-row md:items-center md:gap-xs">
        <div className="flex min-w-0 items-center gap-sm">
          <span
            className={cn(
              "inline-grid h-6 w-6 shrink-0 place-items-center rounded-sm text-caption font-bold",
              rankLogoDotClass(row.ticker),
            )}
            aria-hidden="true"
          >
            {rankLogoInitial(row.name)}
          </span>
          <span className="truncate text-body-sm-strong text-text-strong">
            {row.name}
          </span>
        </div>
        {hasBadges && (
          <div className="flex shrink-0 items-center gap-xs">
            <StockWarningBadges warnings={warnings} size="sm" max={badgeMax} />
          </div>
        )}
      </div>

      {/* 산업(업종명) — md 이상. 미조회는 빈칸(graceful omit). */}
      <span className="hidden truncate text-caption text-text-muted md:block">
        {row.sector ?? ""}
      </span>

      {/* 현재가 */}
      <span className="text-right text-body-sm-strong tabular-nums text-text-strong">
        {formatNumber(row.price)}
      </span>

      {/* 등락률(부호색) */}
      <span
        className={cn("text-right text-body-sm-strong", changeClass(row.direction))}
      >
        {formatPct(row.changePercent, { sign: true })}
      </span>

      {/* 값(거래량/거래대금) — 값 컬럼 있는 탭만, md 이상. 미보유 값은 "-"(포맷터 fail-soft). */}
      {valueColumn && (
        <span className="hidden text-right text-body-sm tabular-nums text-text-muted md:block">
          {valueColumn.format(row)}
        </span>
      )}

      {/* 시가총액 — md 이상. enrich 실패/미설정은 "-". */}
      <span className="hidden text-right text-body-sm-strong tabular-nums text-text-muted md:block">
        {formatMarketCap(row.marketCap)}
      </span>
    </ListRow>
  );
}

/** 로딩 — 플랫 스켈레톤 행(8행). */
function RankSkeleton() {
  return (
    <div aria-busy="true" aria-label={RANK_LOADING}>
      <span className="sr-only">{RANK_LOADING}</span>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-md border-b border-border-line py-md last:border-b-0"
        >
          <Skeleton variant="line" className="mb-0 h-6 w-6 rounded-sm" />
          <Skeleton variant="line" className="mb-0 h-4 w-1/3" />
          <Skeleton variant="line" className="mb-0 ml-auto h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
