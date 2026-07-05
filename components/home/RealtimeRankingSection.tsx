/**
 * RealtimeRankingSection — 홈 "실시간" 랭킹(카드리스 플랫 표), **가용성 기반** 렌더.
 *
 * home-reskin 신규 · `market-status-aware-home` 가용성 개정. 노스스타 `#homeScreen .sec(실시간)` 정합 —
 * 박스 없는 흰 바탕 표: [♥ 관심] [순위] [로고닷+종목명] [(산업)] [현재가] [등락률]. 행 헤어라인만.
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
 * 데이터: 랭킹 행은 산업(sector) 부재 → 컬럼 graceful omit. 색은 부호(상승=빨강/하락=파랑).
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
import { useQueryVolumeRank } from "@/hooks/market/useQueryVolumeRank";
import { useQueryFluctuation } from "@/hooks/market/useQueryFluctuation";
import { useMe } from "@/hooks/auth/useMe";
import { useStockPeek } from "@/hooks/stock/useStockPeek";
import { useWatchlistTickers } from "@/hooks/watchlist/useWatchlistTickers";
import { resolveAvailability, type Availability } from "@/lib/market/availability";
import {
  deriveRankingView,
  type RankingViewState,
} from "@/lib/market/rankingView";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatMoney";
import { formatPct } from "@/lib/utils/formatPct";
import { stockDetailPath } from "@/lib/utils/stockDetailPath";
import { rankLogoDotClass, rankLogoInitial } from "@/lib/utils/rankLogoDot";
import type { FlowDirection } from "@/lib/types/flow/top10";
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
} from "@/lib/copy/home/marketOverview";

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
 * 어느 랭킹도 산업(sector)을 싣지 않지만, 향후 확장 대비 옵셔널로 좁혀 읽어 컬럼 자동 부활.
 */
type RankableRow = {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
  direction: FlowDirection;
  sector?: string;
};

/** 등락 방향 → 등락률 색 토큰(합성 클래스라 cn 사이즈 override 시에도 색 유지). */
function changeClass(direction: FlowDirection): string {
  if (direction === "up") return "signal-up-text";
  if (direction === "down") return "signal-down-text";
  return "text-text-muted text-mono-numeric tabular-nums";
}

export function RealtimeRankingSection() {
  const [tab, setTab] = useState<RankTab>("volume");

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

  return (
    <Section
      title={RANK_SECTION_TITLE}
      action={
        hasTabBar ? (
          <RankTabs
            tabs={availableTabDefs}
            value={effectiveTab ?? availableTabDefs[0].value}
            onChange={setTab}
            className="hidden sm:inline-flex"
          />
        ) : undefined
      }
    >
      {/* 모바일 — 탭을 제목줄 아래 분리 배치(액션 슬롯이 좁음). */}
      {hasTabBar && (
        <RankTabs
          tabs={availableTabDefs}
          value={effectiveTab ?? availableTabDefs[0].value}
          onChange={setTab}
          className="inline-flex self-start sm:hidden"
        />
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
        isAdmin={isAdmin}
        onRetry={retryAll}
        hasTicker={hasTicker}
        addTicker={addTicker}
        removeTicker={removeTicker}
      />
    </Section>
  );
}

/** 콘텐츠 영역 — 로딩/점검/리스트 3-상태 분기(탭바·헤더는 상위가 소유). */
function RankingContent({
  view,
  activeQuery,
  activeTab,
  isAdmin,
  onRetry,
  hasTicker,
  addTicker,
  removeTicker,
}: {
  view: RankingViewState;
  activeQuery:
    | { data?: { rows: RankableRow[] } | undefined; isLoading: boolean }
    | null;
  activeTab: RankTab | undefined;
  isAdmin: boolean;
  onRetry: () => void;
  hasTicker: (ticker: string) => boolean;
  addTicker: (ticker: string, name: string) => void;
  removeTicker: (ticker: string) => void;
}) {
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
  const hasSector = rows.some((row) => !!row.sector);

  return (
    <>
      <div role="list">
        {rows.map((row, i) => (
          <RankRow
            key={row.ticker}
            row={row}
            rank={i + 1}
            showSector={hasSector}
            favorited={hasTicker(row.ticker)}
            onToggleFavorite={() =>
              hasTicker(row.ticker)
                ? removeTicker(row.ticker)
                : addTicker(row.ticker, row.name)
            }
          />
        ))}
      </div>
      {/* 기준 각주 — 활성 탭 기준을 명시. */}
      {activeTab && (
        <p className="text-caption text-text-muted">{RANK_CAPTIONS[activeTab]}</p>
      )}
    </>
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
  showSector,
  favorited,
  onToggleFavorite,
}: {
  row: RankableRow;
  rank: number;
  showSector: boolean;
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

  return (
    <ListRow
      role="listitem"
      tabIndex={0}
      aria-label={`${row.name} 상세 보기`}
      className={cn(
        "-mx-sm cursor-pointer rounded-sm px-sm transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none",
        "grid items-center gap-md",
        showSector
          ? "grid-cols-[auto_1.25rem_1fr_auto] md:grid-cols-[auto_1.25rem_1fr_8rem_auto]"
          : "grid-cols-[auto_1.25rem_1fr_auto]",
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

      {/* 로고닷 + 종목명(코드 미표시) */}
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

      {/* 산업(sector) — 데이터 있을 때만, md 이상 */}
      {showSector && (
        <span className="hidden truncate text-caption text-text-muted md:block">
          {row.sector ?? ""}
        </span>
      )}

      {/* 현재가 + 등락률(우정렬 클러스터) */}
      <div className="flex items-center justify-end gap-md">
        <span className="text-body-sm-strong tabular-nums text-text-strong">
          {formatNumber(row.price)}
        </span>
        <span
          className={cn(
            "w-16 text-right text-body-sm-strong",
            changeClass(row.direction),
          )}
        >
          {formatPct(row.changePercent, { sign: true })}
        </span>
      </div>
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
