/**
 * WatchlistRow — `/watchlist` 관심종목 1행 (client component).
 *
 * PR9(finsight-redesign) → `watchlist-real-data` §3.6 → **watchlist-reskin**(카드리스 플랫 행).
 *
 * watchlist-reskin — 홈 랭킹(`RealtimeRankingSection`의 `RankRow`) 정합:
 *   - 카드 박스·12-col grid 헤더 폐기 → `ListRow`(헤어라인 하단 구분선) + `grid-cols-[auto_1fr_auto]`.
 *   - 행 구성: [★ 제거] [로고닷 + 종목명(**코드 미표시**) + 매수 유의 경고칩] [현재가 + 등락률].
 *   - 색은 부호로 결정(한국식): 상승=빨강(signal-up) / 하락=파랑(signal-down).
 *   - 로고닷은 `rankLogoDotClass`/`rankLogoInitial`(홈 공용, hex 직타 0)로 결정론 색·이니셜.
 *
 * 관심종목 제거(★):
 *   - 별은 이미 담긴 상태이므로 항상 채운 앰버(`text-chart-signal fill-chart-signal`) → 클릭 시 제거.
 *   - ★ a11y — 행이 클릭 가능한 div 이므로 별 버튼에서 `onClick`/`onKeyDown` **stopPropagation** 으로
 *     행 네비게이션과 분리(home-reskin 이 동일 버그를 겪음). 별 조작이 상세 진입을 트리거하지 않는다.
 *   - 제거/멤버십 state 는 상위(`WatchlistContainer`)의 단일 `useWatchlistTickers` 인스턴스가 소유
 *     (`onRemove` prop). 행마다 훅을 호출하면 스냅샷 desync 로 서로의 추가를 지운다.
 *
 * 디그레이드 행(부분 실패 — `fix/watchlist-partial-render`):
 *   - `quote` 없는(시세 실패/누락) ticker 도 담은 채로 남긴다. 종목명(가능 시 `fallbackName`)+경고칩+
 *     "시세를 불러오지 못했어요" 안내 + 별 제거만. 시세 미확정이라 행 클릭(상세 라우팅)은 막는다.
 *
 * 매수 유의 경고칩(`watchlist-warning-badge`): 종목명 옆 `StockWarningBadges`(토스 warnings 공유,
 *   fail-soft). 정상·디그레이드 행 모두 적용(경보는 시세와 무관). 키 없음·무경보·실패면 미표시.
 *
 * 상세 선반입 + 차트 Peek: hover/focus·롱프레스 시 `useStockPeek`(선반입 + 미리보기 팝오버/시트).
 *   시드(가격/등락/방향)를 넘겨 즉시 페인트. 디그레이드 행(시세 없음)은 Peek 미부착.
 */

"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { useStockPeek } from "@/hooks/stock/useStockPeek";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatMoney";
import { formatPct } from "@/lib/utils/formatPct";
import { stockDetailPath } from "@/lib/utils/stockDetailPath";
import { rankLogoDotClass, rankLogoInitial } from "@/lib/utils/rankLogoDot";
import { StockWarningBadges } from "@/components/stock/StockWarningBadges";
import { ListRow } from "@/components/ui/ListRow";
import type { WatchlistQuote } from "@/lib/api/watchlist/list";
import type { StockWarningItem } from "@/lib/types/stock/warnings";
import {
  WATCHLIST_REMOVE_LABEL,
  WATCHLIST_ROW_FAILED,
} from "@/lib/copy/watchlist/labels";

export interface WatchlistRowProps {
  /** ticker — 좌조인 렌더의 기준 키. quote 없으면 디그레이드 행. */
  ticker: string;
  /** 매칭된 시세. undefined = 시세 실패/누락(디그레이드 행). */
  quote?: WatchlistQuote;
  /**
   * 표시 종목명 — 추가 시점 store name → 시드 name(`watchlist-batch-quotes` §3.3 표시 진실 원천).
   * `WatchlistQuote.name` 은 BFF 폴백(시드→ticker)일 뿐이라, 있으면 store name 으로 덮어 표시한다.
   * 정상 행: `fallbackName ?? quote.name`. 디그레이드 행: 있으면 표시, 없으면 ticker 만 노출.
   */
  fallbackName?: string | null;
  /** 활성 매수 유의(경보·VI) — 없거나 빈 배열이면 칩 미표시(fail-soft). */
  warnings?: StockWarningItem[];
  onRemove: (ticker: string) => void;
}

/** 등락 방향 → 등락률 색 토큰(합성 클래스라 cn 사이즈 override 시에도 색 유지). 홈 랭킹과 동일. */
function changeClass(direction: WatchlistQuote["direction"]): string {
  if (direction === "up") return "signal-up-text";
  if (direction === "down") return "signal-down-text";
  return "text-text-muted text-mono-numeric tabular-nums";
}

/** ★ 제거 버튼 — 채운 앰버 별(이미 담김). 행 네비게이션과 분리(stopPropagation). */
function RemoveStarButton({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="inline-grid h-8 w-8 cursor-pointer place-items-center rounded-sm transition-opacity hover:opacity-80"
      onClick={(e) => {
        e.stopPropagation();
        onRemove();
      }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Star
        className="h-5 w-5 text-chart-signal fill-chart-signal"
        aria-hidden="true"
      />
    </button>
  );
}

/** 로고닷 + 종목명(코드 미표시) + 매수 유의 경고칩 — 정상·디그레이드 공용 이름 클러스터. */
function NameCluster({
  ticker,
  name,
  warnings,
}: {
  ticker: string;
  name: string;
  warnings?: StockWarningItem[];
}) {
  return (
    <div className="flex min-w-0 items-center gap-sm">
      <span
        className={cn(
          "inline-grid h-6 w-6 shrink-0 place-items-center rounded-sm text-caption font-bold",
          rankLogoDotClass(ticker),
        )}
        aria-hidden="true"
      >
        {rankLogoInitial(name)}
      </span>
      <span className="min-w-0 truncate text-body-sm-strong text-text-strong">
        {name}
      </span>
      <StockWarningBadges
        warnings={warnings}
        max={1}
        size="sm"
        className="shrink-0"
      />
    </div>
  );
}

function WatchlistRowBase({
  ticker,
  quote,
  fallbackName,
  warnings,
  onRemove,
}: WatchlistRowProps) {
  const router = useRouter();
  // ★ 훅은 조건 분기 전에 무조건 호출(rules-of-hooks). 시드는 정상 행에서만 존재.
  const displayName = fallbackName ?? quote?.name ?? ticker;
  const { peekProps, prefetch } = useStockPeek({
    ticker,
    name: displayName,
    seed: quote
      ? {
          price: quote.price,
          changePercent: quote.changePercent,
          direction: quote.direction,
        }
      : undefined,
  });

  if (!quote) {
    // 디그레이드 행 — 담은 종목은 사라지지 않는다. 시세 미확정이라 클릭(상세 라우팅)·Peek 미부착.
    // 표시명: fallbackName(있으면) → 없으면 ticker 자체(코드 미표시 규칙상 별도 코드 줄 없음).
    return (
      <ListRow
        role="listitem"
        className="-mx-sm grid grid-cols-[auto_1fr_auto] items-center gap-md rounded-sm px-sm"
      >
        <RemoveStarButton
          label={`${displayName} ${WATCHLIST_REMOVE_LABEL}`}
          onRemove={() => onRemove(ticker)}
        />
        <NameCluster ticker={ticker} name={displayName} warnings={warnings} />
        <span className="justify-self-end whitespace-nowrap text-caption text-text-muted">
          {WATCHLIST_ROW_FAILED}
        </span>
      </ListRow>
    );
  }

  // 표시명 — store name(추가 시점) → 시드 name 우선, 없으면 BFF 폴백 quote.name(§3.3). 상단 계산 재사용.
  const go = () => {
    prefetch(quote.ticker);
    router.push(stockDetailPath(quote.ticker, displayName));
  };

  return (
    <ListRow
      role="listitem"
      tabIndex={0}
      aria-label={`${displayName} 상세 보기`}
      className={cn(
        "-mx-sm cursor-pointer rounded-sm px-sm transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none",
        "grid grid-cols-[auto_1fr_auto] items-center gap-md",
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
      <RemoveStarButton
        label={`${displayName} ${WATCHLIST_REMOVE_LABEL}`}
        onRemove={() => onRemove(quote.ticker)}
      />
      <NameCluster ticker={quote.ticker} name={displayName} warnings={warnings} />
      <div className="flex items-center justify-end gap-md">
        <span className="text-body-sm-strong tabular-nums text-text-strong">
          {formatNumber(quote.price)}
        </span>
        <span
          className={cn(
            "w-16 text-right text-body-sm-strong",
            changeClass(quote.direction),
          )}
        >
          {formatPct(quote.changePercent, { sign: true })}
        </span>
      </div>
    </ListRow>
  );
}

/** 행 수 30 soft cap·부모 잦은 리렌더 대비 메모이즈(UI 점검 #11). */
export const WatchlistRow = memo(WatchlistRowBase);
