/**
 * RealtimeRankingSection — 홈 "실시간" 랭킹(카드리스 플랫 표).
 *
 * home-reskin 신규. 노스스타 `#homeScreen .sec(실시간)` 정합 — 박스 없는 흰 바탕 표:
 *   [♥ 관심] [순위] [로고닷+종목명] [(산업)] [현재가] [등락률]. 행 헤어라인만, 아웃라인 박스 없음.
 *
 * 탭(거래량/거래대금/급상승/급하락) **4종 모두 실배선**:
 *   - 거래량   → `useQueryVolumeRank("volume")`
 *   - 거래대금 → `useQueryVolumeRank("value")`
 *   - 급상승   → `useQueryFluctuation("up")`
 *   - 급하락   → `useQueryFluctuation("down")`
 *   4개 훅을 항상 호출(rules of hooks)하되 **활성 탭만 `enabled` 로 켠다** — 마운트 시 KIS 랭킹 TR 을
 *   한 번에 여러 개 발사하지 않기 위함(홈은 이미 KIS 콜이 많아 초당 한도 위험). 활성 탭 결과가
 *   리스트/로딩/에러/스켈레톤을 구동한다.
 *
 * 탭별 우아한 실패 처리(KIS TR 장애 시): 활성 탭 조회가 실패하면 그 탭을 **failed 집합**에 넣는다.
 *   - failed + **비활성** 탭 → 탭바에서 회색 비활성(클릭 불가) 처리(`aria-disabled`).
 *   - failed + **활성** 탭 → 리스트 영역에서 기존 에러 문구 + "다시 시도"(refetch) 노출(죽은 탭 방지).
 *   - 복구: 활성 실패 탭에서 "다시 시도" 성공 시 failed 집합에서 제거(회색 해제).
 *   ★ 에러 시 탭 자동 전환은 하지 않는다 — 로컬(KIS down)에서 전 탭이 실패해도 스위치 루프로
 *     떨리지 않도록. 전환은 오직 사용자 클릭으로만.
 *
 * 데이터: 거래량/거래대금 순위(`VolumeRankRow`)·등락률 순위(`FluctuationRow`) 모두 **산업(sector)
 *   필드가 없다**. 노스스타의 산업 컬럼은 데이터가 있을 때만 노출하고, 전 행 부재 시 컬럼을 통째로
 *   접는다(graceful omit). 향후 sector 를 싣는 목록이 오면 자동으로 컬럼이 살아난다.
 *
 * 색은 부호로 결정(한국식): 상승=빨강(signal-up) / 하락=파랑(signal-down).
 * 행 클릭 → `/stock/[ticker]`. hover/focus·롱프레스 시 `useStockPeek` 로 상세 선반입 + 차트 Peek
 *   (미리보기). 시드(가격/등락/방향)를 넘겨 팝오버/시트 즉시 페인트.
 *
 * 컨벤션(`docs/rules/frontend.md` §1): useQuery 직접 import 금지 → 도메인 훅만 소비.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { ListRow } from "@/components/ui/ListRow";
import { Skeleton } from "@/components/ui/Skeleton";
import { useQueryVolumeRank } from "@/hooks/market/useQueryVolumeRank";
import { useQueryFluctuation } from "@/hooks/market/useQueryFluctuation";
import { useStockPeek } from "@/hooks/stock/useStockPeek";
import { useWatchlistTickers } from "@/hooks/watchlist/useWatchlistTickers";
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
  RANK_TAB_UNAVAILABLE,
  RANK_LOADING,
  RANK_ERROR,
  RANK_EMPTY,
  RANK_RETRY,
  RANK_CAPTION_VOLUME,
  RANK_CAPTION_TURNOVER,
  RANK_CAPTION_SURGE,
  RANK_CAPTION_PLUNGE,
  RANK_FAVORITE_ADD,
  RANK_FAVORITE_REMOVE,
} from "@/lib/copy/home/marketOverview";

/** 랭킹 기준 탭 — 4종 모두 실배선. */
type RankTab = "volume" | "turnover" | "surge" | "plunge";

const RANK_TABS: ReadonlyArray<{ value: RankTab; label: string }> = [
  { value: "volume", label: RANK_TAB_VOLUME },
  { value: "turnover", label: RANK_TAB_TURNOVER },
  { value: "surge", label: RANK_TAB_SURGE },
  { value: "plunge", label: RANK_TAB_PLUNGE },
];

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
  // 조회 실패 탭 집합 — 활성 탭이 실패하면 담고, 다시 성공하면 뺀다(복구). 비활성 실패 탭은 회색 처리.
  const [failedTabs, setFailedTabs] = useState<ReadonlySet<RankTab>>(
    () => new Set<RankTab>(),
  );

  // 4개 랭킹 훅을 항상 호출(rules of hooks)하되, 활성 탭만 enabled-게이트로 실제 페치한다.
  const volumeQuery = useQueryVolumeRank("volume", {
    enabled: tab === "volume",
  });
  const turnoverQuery = useQueryVolumeRank("value", {
    enabled: tab === "turnover",
  });
  const surgeQuery = useQueryFluctuation("up", { enabled: tab === "surge" });
  const plungeQuery = useQueryFluctuation("down", { enabled: tab === "plunge" });

  // ★ 관심종목 훅은 섹션에서 **단일 인스턴스**로 소유한다. 행마다 useWatchlistTickers 를 호출하면
  //   각 행이 독립 state 스냅샷을 들고 전체 배열을 덮어써(writeEntries) 서로의 추가를 지운다.
  //   단일 소유 → 토글 시 섹션 리렌더로 전 행의 favorited 가 함께 갱신된다.
  const { hasTicker, addTicker, removeTicker } = useWatchlistTickers();

  // 활성 탭 결과가 리스트/로딩/에러/스켈레톤을 구동한다(switch 등가 — 탭 키로 선택).
  const active = {
    volume: volumeQuery,
    turnover: turnoverQuery,
    surge: surgeQuery,
    plunge: plungeQuery,
  }[tab];

  const activeIsError = active.isError;
  const activeIsSuccess = active.isSuccess;

  // 활성 탭 조회 결과만 failed 집합에 반영 — 실패면 추가, 성공이면 제거(복구). 비활성 탭은 손대지 않아
  // 떠난 실패 탭의 회색 상태가 유지된다. 자동 탭 전환은 하지 않으므로 스위치 루프가 없다.
  useEffect(() => {
    if (activeIsError) {
      setFailedTabs((prev) => {
        if (prev.has(tab)) return prev;
        const next = new Set(prev);
        next.add(tab);
        return next;
      });
    } else if (activeIsSuccess) {
      setFailedTabs((prev) => {
        if (!prev.has(tab)) return prev;
        const next = new Set(prev);
        next.delete(tab);
        return next;
      });
    }
  }, [activeIsError, activeIsSuccess, tab]);

  const rows: RankableRow[] = active.data?.rows ?? [];
  // 전 행이 산업 부재면 컬럼을 접는다(현재 랭킹은 sector 미제공 → 접힘).
  const hasSector = rows.some((row) => !!row.sector);

  return (
    <Section
      title={RANK_SECTION_TITLE}
      action={
        <RankTabs
          value={tab}
          onChange={setTab}
          failedTabs={failedTabs}
          className="hidden sm:inline-flex"
        />
      }
    >
      {/* 모바일 — 탭을 제목줄 아래 분리 배치(액션 슬롯이 좁음). self-start 로 콘텐츠 폭만. */}
      <RankTabs
        value={tab}
        onChange={setTab}
        failedTabs={failedTabs}
        className="inline-flex self-start sm:hidden"
      />

      {active.isLoading ? (
        <RankSkeleton />
      ) : active.isError ? (
        <div className="flex flex-col items-start gap-md py-md" role="alert">
          <p className="text-body-sm text-text-muted">{RANK_ERROR}</p>
          <button
            type="button"
            className="button-secondary"
            onClick={() => active.refetch()}
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
          {/* 기준 각주 — 활성 탭 기준을 명시. */}
          <p className="text-caption text-text-muted">{RANK_CAPTIONS[tab]}</p>
        </>
      )}
    </Section>
  );
}

/**
 * 거래량/거래대금/급상승/급하락 세그먼트 — ModeToggle 과 동일 시각 언어(pill + 흰 활성).
 * 조회 실패 + 비활성 탭은 회색 비활성(클릭 불가) — 활성 탭은 실패해도 클릭 대상(리스트가 에러+재시도).
 */
function RankTabs({
  value,
  onChange,
  failedTabs,
  className,
}: {
  value: RankTab;
  onChange: (tab: RankTab) => void;
  failedTabs: ReadonlySet<RankTab>;
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
        // 실패 + 비활성 탭만 회색 비활성 — 활성 탭은 실패해도 리스트에서 에러+재시도를 보여준다.
        const disabled = failedTabs.has(opt.value) && !active;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            aria-disabled={disabled || undefined}
            title={disabled ? RANK_TAB_UNAVAILABLE : undefined}
            className={cn(
              "h-button-sm-h rounded-pill px-md text-button-sm transition-colors",
              active
                ? "bg-surface text-text-strong shadow-sm"
                : "text-text-muted",
              disabled
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer hover:text-text-strong",
            )}
            onClick={() => {
              if (!disabled) onChange(opt.value);
            }}
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
