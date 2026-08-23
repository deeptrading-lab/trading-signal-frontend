"use client";

/**
 * MyStocksSummary — `/profile` "내 종목" 요약 (client).
 *
 * profile-real-data — 관심종목과 최근 본 종목을 마이페이지에서도 한눈에 보게 한다.
 *
 * ⚠️ 두 목록 모두 **브라우저 로컬 저장**이다(관심종목 = `lib/api/watchlist/store`,
 *    최근 본 종목 = `lib/utils/recentSearch`). 계정에 묶인 데이터가 아니라 기기에 묶인
 *    데이터라, 다른 기기로 로그인하면 비어 있다. 사용자가 오해하지 않게 안내 문구를 함께 둔다.
 *    (서버 영구화가 필요해지면 watchlist 훅의 시그니처는 그대로 두고 저장소만 교체하면 된다 —
 *     `useWatchlistTickers` 가 저장소 중립으로 설계돼 있다.)
 *
 * 최근 본 종목은 훅이 아니라 모듈 함수라 mount 후 1회만 읽는다(SSR 안전 — 초기 렌더는 빈 배열).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { useWatchlistTickers } from "@/hooks/watchlist/useWatchlistTickers";
import { readRecentSearches, type RecentSearchEntry } from "@/lib/utils/recentSearch";
import {
  MY_STOCKS_TITLE,
  MY_STOCKS_WATCHLIST,
  MY_STOCKS_RECENT,
  MY_STOCKS_EMPTY,
  MY_STOCKS_RECENT_EMPTY,
  MY_STOCKS_MORE,
  MY_STOCKS_LOCAL_HINT,
} from "@/lib/copy/profile/labels";

const PREVIEW_COUNT = 5;

export function MyStocksSummary() {
  const { tickers, getName } = useWatchlistTickers();
  const [recent, setRecent] = useState<RecentSearchEntry[]>([]);

  // localStorage 는 서버에 없다 — mount 후 읽어 hydration mismatch 를 피한다.
  useEffect(() => {
    setRecent(readRecentSearches());
  }, []);

  return (
    <Section
      title={MY_STOCKS_TITLE}
      action={
        <Link
          href="/watchlist"
          className="inline-flex items-center gap-xs text-caption text-text-muted hover:text-text-strong"
        >
          {MY_STOCKS_MORE}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      }
    >
      <div className="flex flex-col gap-lg">
        <TickerGroup
          label={MY_STOCKS_WATCHLIST}
          emptyText={MY_STOCKS_EMPTY}
          items={tickers
            .slice(0, PREVIEW_COUNT)
            .map((ticker) => ({ ticker, name: getName(ticker) ?? ticker }))}
        />
        <TickerGroup
          label={MY_STOCKS_RECENT}
          emptyText={MY_STOCKS_RECENT_EMPTY}
          items={recent
            .slice(0, PREVIEW_COUNT)
            .map((entry) => ({ ticker: entry.ticker, name: entry.name ?? entry.ticker }))}
        />
      </div>
      <p className="text-caption text-text-muted">{MY_STOCKS_LOCAL_HINT}</p>
    </Section>
  );
}

/** 라벨 + 종목 칩 줄. 빈 목록이면 안내 문구로 대체한다. */
function TickerGroup({
  label,
  emptyText,
  items,
}: {
  label: string;
  emptyText: string;
  items: Array<{ ticker: string; name: string }>;
}) {
  return (
    <div className="flex flex-col gap-sm">
      <p className="text-body-sm-strong text-text-strong">{label}</p>
      {items.length === 0 ? (
        <p className="text-body-sm text-text-muted">{emptyText}</p>
      ) : (
        <ul className="flex flex-wrap gap-sm">
          {items.map((item) => (
            <li key={item.ticker}>
              <Link
                href={`/stock/${item.ticker}`}
                className="inline-flex rounded-pill border border-border-line px-md py-xs text-body-sm text-text-strong hover:bg-surface-muted"
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
