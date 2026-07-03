/**
 * SegmentedTabs — /analyze 공용 세그먼트 탭(pill 그룹).
 *
 * analyze-reskin — 홈 랭킹(`RealtimeRankingSection`의 `RankTabs`)과 동일한 시각 언어:
 *   surface-muted 트랙 + 활성 pill = surface(흰) + shadow-sm. 상위 탭(분석 결과/토큰 사용량)과
 *   공급자 탭(Claude/Codex)이 같은 컨트롤을 공유해 카드리스 화이트 톤에서 일관되게 읽힌다.
 *
 * 프레젠테이션 전용 — value/onChange 는 호출부가 소유(URL 쿼리·로컬 state 무관). 우측 툴바(개수·
 * 새로고침)는 별도 마크업이라 이 컴포넌트는 pill 그룹만 렌더한다. hex/px 직타 0 — 토큰 클래스만.
 */

"use client";

import { cn } from "@/lib/utils/cn";

export interface SegmentedTabOption<T extends string> {
  key: T;
  label: string;
}

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: ReadonlyArray<SegmentedTabOption<T>>;
  value: T;
  onChange: (key: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-xs rounded-pill bg-surface-muted p-xs",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.key)}
            className={cn(
              "h-button-sm-h rounded-pill px-md text-button-sm transition-colors",
              active
                ? "bg-surface text-text-strong shadow-sm"
                : "cursor-pointer text-text-muted hover:text-text-strong",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
