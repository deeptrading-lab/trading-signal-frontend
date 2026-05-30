/**
 * DisclosureFeedContainer — 관심종목 기준 최신 공시 피드.
 *
 * home-market-redesign PR2 신규.
 *
 * 데이터 소스:
 *   - `useWatchlistTickers()` → tickers (처음 3개 slice)
 *   - `useQueryDisclosures(tickers.slice(0, 3), 3)` → 각 ticker 최신 3건 병렬 조회 + 플래팅 + 최신순 정렬
 *
 * 상태:
 *   - 로딩: skeleton
 *   - tickers 없음: "관심 종목을 추가하면 최신 공시를 볼 수 있어요"
 *   - 공시 없음: "최근 공시가 없어요"
 *   - 성공: disclosure-row 목록 (ticker 배지 + 공시명 + 날짜)
 *
 * 공시 URL: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=` + rceptNo
 *
 * 컨벤션 (`docs/rules/frontend.md` §1):
 *   - useQuery 직접 import 금지 → 도메인 훅(useWatchlistTickers, useQueryDisclosures)만 소비.
 */

"use client";

import { FileText } from "lucide-react";
import { useWatchlistTickers } from "@/hooks/watchlist/useWatchlistTickers";
import { useQueryDisclosures } from "@/hooks/disclosure/useQueryDisclosures";

const DART_REPORT_BASE_URL =
  "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=";

const MAX_TICKERS = 3;
const DISCLOSURES_PER_TICKER = 3;

function toDisclosureUrl(rceptNo: string): string {
  return `${DART_REPORT_BASE_URL}${rceptNo}`;
}

/** YYYYMMDD → "YYYY.MM.DD" 표시 포맷. ISO 8601 일자도 처리. */
function formatDisplayDate(rceptDate: string): string {
  // rceptDate: "2024-05-28" 형태 (BFF 매핑 결과)
  if (rceptDate.length === 10 && rceptDate[4] === "-") {
    return rceptDate.replace(/-/g, ".");
  }
  // YYYYMMDD 형태
  if (rceptDate.length === 8) {
    return `${rceptDate.slice(0, 4)}.${rceptDate.slice(4, 6)}.${rceptDate.slice(6, 8)}`;
  }
  return rceptDate;
}

export function DisclosureFeedContainer() {
  const { tickers } = useWatchlistTickers();
  const sliced = tickers.slice(0, MAX_TICKERS);

  const { items, isLoading } = useQueryDisclosures(sliced, DISCLOSURES_PER_TICKER);

  return (
    <section className="card" aria-label="최신 공시">
      <header className="mb-lg flex items-center gap-sm">
        <FileText
          className="h-xl w-xl text-accent-vivid"
          aria-hidden="true"
        />
        <h2 className="text-h2 text-text-strong">최신 공시</h2>
      </header>

      {/* 로딩 */}
      {isLoading && sliced.length > 0 && (
        <div className="skeleton min-h-[120px]" aria-busy="true">
          <span className="sr-only">공시 목록 로딩 중</span>
          <div className="skeleton-line skeleton-line-medium" />
          <div className="skeleton-line skeleton-line-narrow" />
          <div className="skeleton-line skeleton-line-medium" />
        </div>
      )}

      {/* 관심종목 없음 */}
      {!isLoading && sliced.length === 0 && (
        <p className="text-body-sm text-text-muted py-lg">
          관심 종목을 추가하면 최신 공시를 볼 수 있어요
        </p>
      )}

      {/* 공시 없음 */}
      {!isLoading && sliced.length > 0 && items.length === 0 && (
        <p className="text-body-sm text-text-muted py-lg">최근 공시가 없어요</p>
      )}

      {/* 공시 목록 */}
      {!isLoading && items.length > 0 && (
        <ul className="flex flex-col divide-y divide-border-line" role="list">
          {items.map((item) => (
            <li key={`${item.ticker}-${item.rceptNo}`}>
              <a
                href={toDisclosureUrl(item.rceptNo)}
                target="_blank"
                rel="noopener noreferrer"
                className="disclosure-row block"
                aria-label={`${item.corpName} — ${item.reportName}`}
              >
                <div className="flex items-start justify-between gap-md w-full">
                  <div className="flex items-start gap-sm min-w-0">
                    <span className="disclosure-tag mt-[2px]">{item.ticker}</span>
                    <span className="text-body-sm-strong text-text-strong truncate">
                      {item.reportName}
                    </span>
                  </div>
                  <span className="text-caption text-text-muted shrink-0 mt-[2px]">
                    {formatDisplayDate(item.rceptDate)}
                  </span>
                </div>
                <p className="mt-xs text-caption text-text-muted ml-[calc(theme(spacing.sm)*2+60px)]">
                  {item.corpName}
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
