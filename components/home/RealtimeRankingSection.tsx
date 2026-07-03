/**
 * RealtimeRankingSection — 홈 "실시간" 랭킹(카드리스 플랫 표).
 *
 * home-reskin 신규. 노스스타 `#homeScreen .sec(실시간)` 정합 — 박스 없는 흰 바탕 표:
 *   [♥ 관심] [순위] [로고닷+종목명] [(산업)] [현재가] [등락률]. 행 헤어라인만, 아웃라인 박스 없음.
 *
 * 데이터: 기존 도메인 훅 `useQueryVolumeRank()`(거래량 순위) 재사용 — 데이터 계층 무변경.
 *   ⚠️ 거래량 순위 payload 에는 **산업(sector) 필드가 없다**(ticker/name/price/changePercent/
 *   direction/volume). 노스스타의 산업 컬럼은 데이터가 있을 때만 노출하고, 전 행 부재 시 컬럼을
 *   통째로 접는다(graceful omit). 향후 sector 를 싣는 목록이 오면 자동으로 컬럼이 살아난다.
 *
 * 탭(거래량/거래대금/급상승/급하락): **거래량만 실배선**. 거래대금·급상승·급하락은 held PR #212
 *   (`useQueryFluctuation` / `useQueryVolumeRank(by)`) 에서 배선 — 본 PR 은 #212 에 의존하지 않는다.
 *   미배선 탭은 비활성(dimmed, 클릭 불가) 자리표시자로 남긴다.
 *
 * 색은 부호로 결정(한국식): 상승=빨강(signal-up) / 하락=파랑(signal-down).
 * 행 클릭 → `/stock/[ticker]`. hover/focus 시 `usePrefetchStockDetail` 로 상세 선반입
 *   (차트 peek 는 후속 단계 — 여기선 prefetch intent·경로만 부착).
 *
 * 컨벤션(`docs/rules/frontend.md` §1): useQuery 직접 import 금지 → 도메인 훅만 소비.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { ListRow } from "@/components/ui/ListRow";
import { Skeleton } from "@/components/ui/Skeleton";
import { useQueryVolumeRank } from "@/hooks/market/useQueryVolumeRank";
import { usePrefetchStockDetail } from "@/hooks/stock/usePrefetchStockDetail";
import { useWatchlistTickers } from "@/hooks/watchlist/useWatchlistTickers";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatMoney";
import { formatPct } from "@/lib/utils/formatPct";
import { stockDetailPath } from "@/lib/utils/stockDetailPath";
import { rankLogoDotClass, rankLogoInitial } from "@/lib/utils/rankLogoDot";
import type { VolumeRankRow } from "@/lib/types/market/volumeRank";
import type { FlowDirection } from "@/lib/types/flow/top10";
import {
  RANK_SECTION_TITLE,
  RANK_TAB_VOLUME,
  RANK_TAB_TURNOVER,
  RANK_TAB_SURGE,
  RANK_TAB_PLUNGE,
  RANK_TAB_COMING_SOON,
  RANK_LOADING,
  RANK_ERROR,
  RANK_EMPTY,
  RANK_RETRY,
  RANK_CAPTION,
  RANK_FAVORITE_ADD,
  RANK_FAVORITE_REMOVE,
} from "@/lib/copy/home/marketOverview";

/** 랭킹 기준 탭 — 거래량만 실배선(held PR #212 에서 나머지 배선). */
type RankTab = "volume" | "turnover" | "surge" | "plunge";

const RANK_TABS: ReadonlyArray<{ value: RankTab; label: string }> = [
  { value: "volume", label: RANK_TAB_VOLUME },
  // held PR #212 — useQueryVolumeRank(by: "turnover") 로 배선.
  { value: "turnover", label: RANK_TAB_TURNOVER },
  // held PR #212 — useQueryFluctuation(dir: "up") 로 배선.
  { value: "surge", label: RANK_TAB_SURGE },
  // held PR #212 — useQueryFluctuation(dir: "down") 로 배선.
  { value: "plunge", label: RANK_TAB_PLUNGE },
];

/** 산업(sector) 이 실린 목록만 컬럼 노출 — 향후 확장 대비 옵셔널 필드로 좁혀 읽는다. */
type RankableRow = VolumeRankRow & { sector?: string };

/** 등락 방향 → 등락률 색 토큰(합성 클래스라 cn 사이즈 override 시에도 색 유지). */
function changeClass(direction: FlowDirection): string {
  if (direction === "up") return "signal-up-text";
  if (direction === "down") return "signal-down-text";
  return "text-text-muted text-mono-numeric tabular-nums";
}

export function RealtimeRankingSection() {
  const [tab, setTab] = useState<RankTab>("volume");
  // 거래량만 실배선 — 다른 탭은 비활성 자리표시자라 항상 거래량 데이터를 조회한다.
  const { data, isLoading, isError, refetch } = useQueryVolumeRank();
  // ★ 관심종목 훅은 섹션에서 **단일 인스턴스**로 소유한다. 행마다 useWatchlistTickers 를 호출하면
  //   각 행이 독립 state 스냅샷을 들고 전체 배열을 덮어써(writeEntries) 서로의 추가를 지운다.
  //   단일 소유 → 토글 시 섹션 리렌더로 전 행의 favorited 가 함께 갱신된다.
  const { hasTicker, addTicker, removeTicker } = useWatchlistTickers();

  const rows: RankableRow[] = data?.rows ?? [];
  // 전 행이 산업 부재면 컬럼을 접는다(거래량 순위는 현재 sector 미제공 → 접힘).
  const hasSector = rows.some((row) => !!row.sector);

  return (
    <Section
      title={RANK_SECTION_TITLE}
      action={
        <RankTabs
          value={tab}
          onChange={setTab}
          className="hidden sm:inline-flex"
        />
      }
    >
      {/* 모바일 — 탭을 제목줄 아래 분리 배치(액션 슬롯이 좁음). self-start 로 콘텐츠 폭만. */}
      <RankTabs
        value={tab}
        onChange={setTab}
        className="inline-flex self-start sm:hidden"
      />

      {isLoading ? (
        <RankSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-start gap-md py-md" role="alert">
          <p className="text-body-sm text-text-muted">{RANK_ERROR}</p>
          <button
            type="button"
            className="button-secondary"
            onClick={() => refetch()}
          >
            {RANK_RETRY}
          </button>
        </div>
      ) : rows.length === 0 ? (
        <p className="py-md text-body-sm text-text-muted">{RANK_EMPTY}</p>
      ) : (
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
          {/* 기준 각주 — 거래량 순위임을 명시(다른 탭은 자리표시자). */}
          <p className="text-caption text-text-muted">{RANK_CAPTION}</p>
        </>
      )}
    </Section>
  );
}

/** 거래량/거래대금/급상승/급하락 세그먼트 — ModeToggle 과 동일 시각 언어(pill + 흰 활성). */
function RankTabs({
  value,
  onChange,
  className,
}: {
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
      {RANK_TABS.map((opt) => {
        const active = value === opt.value;
        // 거래량 외 탭은 held PR #212 배선 전까지 비활성 자리표시자.
        const enabled = opt.value === "volume";
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            aria-disabled={!enabled}
            title={enabled ? undefined : RANK_TAB_COMING_SOON}
            className={cn(
              "h-button-sm-h rounded-pill px-md text-button-sm transition-colors",
              active
                ? "bg-surface text-text-strong shadow-sm"
                : "text-text-muted",
              enabled
                ? "cursor-pointer hover:text-text-strong"
                : "cursor-not-allowed opacity-50",
            )}
            onClick={() => enabled && onChange(opt.value)}
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
  const { prefetch, onIntent, cancelIntent } = usePrefetchStockDetail();

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
      onMouseEnter={() => onIntent(row.ticker)}
      onMouseLeave={cancelIntent}
      onFocus={() => onIntent(row.ticker)}
      onBlur={cancelIntent}
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
