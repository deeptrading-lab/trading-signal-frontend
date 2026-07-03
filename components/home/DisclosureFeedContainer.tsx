/**
 * DisclosureFeedContainer — 관심종목 기준 최신 공시 피드(카드리스 플랫 피드).
 *
 * home-market-redesign PR2 신규 → home-reskin 리스킨(카드 박스 제거 → 플랫 `Section` + 헤어라인 행).
 *
 * 데이터 소스(무변경):
 *   - `useWatchlistTickers()` → tickers (처음 3개 slice)
 *   - `useQueryDisclosures(tickers.slice(0, 3), 3)` → 각 ticker 최신 3건 병렬 조회 + 플래팅 + 최신순 정렬
 *
 * 표현(노스스타 `#homeScreen .feed` 정합) — 기업별 그룹 헤더를 접고 **한 행 = 한 공시**로 평탄화:
 *   [종목명 태그] [보고서명(muted, truncate)] [시각(caption)]. 행 헤어라인만, 아웃라인 박스 없음.
 *
 * 상태:
 *   - 로딩: skeleton 행
 *   - tickers 없음: "관심 종목을 추가하면 최신 공시를 볼 수 있어요"
 *   - 공시 없음: "최근 공시가 없어요"
 *
 * 컨벤션(`docs/rules/frontend.md` §1): useQuery 직접 import 금지 → 도메인 훅만 소비.
 */

"use client";

import { useWatchlistTickers } from "@/hooks/watchlist/useWatchlistTickers";
import { useQueryDisclosures } from "@/hooks/disclosure/useQueryDisclosures";
import { Section } from "@/components/ui/Section";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/cn";
import {
  DISCLOSURE_FEED_TITLE,
  DISCLOSURE_FEED_EMPTY_TICKERS,
  DISCLOSURE_FEED_EMPTY,
  DISCLOSURE_FEED_ERROR,
  disclosureFeedCount,
} from "@/lib/copy/home/disclosure";

const DART_REPORT_BASE_URL = "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=";

const MAX_TICKERS = 3;
const DISCLOSURES_PER_TICKER = 3;
/** 피드 노출 상한 — 노스스타 "최근 12건" 정합. */
const MAX_FEED_ITEMS = 12;

function toDisclosureUrl(rceptNo: string): string {
  return `${DART_REPORT_BASE_URL}${rceptNo}`;
}

/** YYYYMMDD → "YYYY.MM.DD" 표시 포맷. ISO 8601 일자도 처리. */
function formatDisplayDate(rceptDate: string): string {
  if (rceptDate.length === 10 && rceptDate[4] === "-") {
    return rceptDate.replace(/-/g, ".");
  }
  if (rceptDate.length === 8) {
    return `${rceptDate.slice(0, 4)}.${rceptDate.slice(4, 6)}.${rceptDate.slice(6, 8)}`;
  }
  return rceptDate;
}

export function DisclosureFeedContainer() {
  const { tickers, getName } = useWatchlistTickers();
  const sliced = tickers.slice(0, MAX_TICKERS);

  const { items, isLoading, isError } = useQueryDisclosures(
    sliced,
    DISCLOSURES_PER_TICKER,
  );
  const feed = items.slice(0, MAX_FEED_ITEMS);

  const showCount = !isLoading && !isError && feed.length > 0;

  return (
    <Section
      title={DISCLOSURE_FEED_TITLE}
      action={
        showCount ? (
          <span className="text-caption text-text-muted">
            {disclosureFeedCount(feed.length)}
          </span>
        ) : undefined
      }
    >
      {/* 로딩 */}
      {isLoading && sliced.length > 0 && (
        <div aria-busy="true">
          <span className="sr-only">공시 목록 로딩 중</span>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-md border-b border-border-line py-md last:border-b-0"
            >
              <Skeleton variant="line" className="mb-0 h-5 w-16 rounded-pill" />
              <Skeleton variant="line" className="mb-0 h-4 flex-1" />
              <Skeleton variant="line" className="mb-0 h-3 w-10" />
            </div>
          ))}
        </div>
      )}

      {/* 관심종목 없음 */}
      {!isLoading && sliced.length === 0 && (
        <p className="py-md text-body-sm text-text-muted">
          {DISCLOSURE_FEED_EMPTY_TICKERS}
        </p>
      )}

      {/* 에러 */}
      {!isLoading && isError && (
        <p className="py-md text-body-sm text-text-muted">
          {DISCLOSURE_FEED_ERROR}
        </p>
      )}

      {/* 공시 없음 */}
      {!isLoading && !isError && sliced.length > 0 && feed.length === 0 && (
        <p className="py-md text-body-sm text-text-muted">
          {DISCLOSURE_FEED_EMPTY}
        </p>
      )}

      {/* 플랫 피드 — 한 행 = 한 공시 */}
      {showCount && (
        <ul role="list">
          {feed.map((item) => (
            <li key={item.rceptNo}>
              <a
                href={toDisclosureUrl(item.rceptNo)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${getName(item.ticker) ?? item.corpName ?? item.ticker} ${item.reportName}`}
                className={cn(
                  "-mx-sm flex items-center gap-md rounded-sm px-sm py-md",
                  "border-b border-border-line last:border-b-0",
                  "transition-colors hover:bg-surface-muted",
                )}
              >
                <span className="disclosure-tag max-w-[6.5rem] truncate">
                  {getName(item.ticker) ?? item.corpName ?? item.ticker}
                </span>
                <span className="min-w-0 flex-1 truncate text-body-sm text-text-strong">
                  {item.reportName}
                </span>
                <span className="shrink-0 text-caption tabular-nums text-text-muted">
                  {formatDisplayDate(item.rceptDate)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
