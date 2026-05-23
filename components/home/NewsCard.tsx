/**
 * NewsCard — 실시간 관련 뉴스 리스트 (3건).
 *
 * PR6 (finsight-redesign) 신규.
 *
 * 시안 `AnalysisDashboard.tsx` L147~L172 정합 — 헤더 (타이틀 + "더보기" 링크) + 3 항목 리스트.
 * 각 항목: 좌측 작은 dot 마커 + 본문 (제목 + 출처 칩 + 시간).
 * 호버 시 제목이 `accent-vivid` 로 전환.
 *
 * v8 토큰:
 *   - 카드 셸 = `card` 합성 토큰.
 *   - 출처 칩 = `badge-info` 합성 토큰 (info-soft 배경 + info 텍스트).
 *   - 호버 = `group-hover:text-accent-vivid` cascade.
 *
 * 정적 컴포넌트 — props-only.
 */

import { cn } from "@/lib/utils/cn";
import type { NewsItem, NewsList } from "@/lib/types/home/news";
import { NEWS_TITLE, NEWS_VIEW_MORE } from "@/lib/copy/home/labels";

export interface NewsCardProps {
  news: NewsList;
}

export function NewsCard({ news }: NewsCardProps) {
  return (
    <section className="card" aria-label={NEWS_TITLE}>
      <header className="flex justify-between items-center mb-md">
        <h2 className="text-h2 text-text-strong">{NEWS_TITLE}</h2>
        <button
          type="button"
          className="text-body-sm text-accent-vivid hover:underline cursor-pointer border-0 bg-transparent"
        >
          {NEWS_VIEW_MORE}
        </button>
      </header>
      <ul className="flex flex-col gap-md">
        {news.map((item, idx) => (
          <NewsRow
            key={`${item.source}-${idx}`}
            item={item}
            isLast={idx === news.length - 1}
          />
        ))}
      </ul>
    </section>
  );
}

function NewsRow({ item, isLast }: { item: NewsItem; isLast: boolean }) {
  return (
    <li
      className={cn(
        "flex gap-sm group cursor-pointer pb-sm",
        !isLast && "border-b border-border-line",
      )}
    >
      <span
        className="w-[6px] h-[6px] rounded-pill bg-accent-vivid mt-[6px] flex-shrink-0"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-xs min-w-0">
        <p className="text-body-sm-strong text-text-strong line-clamp-2 leading-snug group-hover:text-accent-vivid">
          {item.title}
        </p>
        <div className="flex items-center gap-xs text-caption text-text-muted">
          <span className="badge-info text-caption h-[20px] px-sm">
            {item.source}
          </span>
          <span aria-hidden="true">·</span>
          <span>{item.time}</span>
        </div>
      </div>
    </li>
  );
}
