import { cn } from "@/lib/utils/cn";
import { BrandPulseIcon } from "@/components/layout/BrandPulseIcon";
import { NAV_BRAND_LABEL } from "@/lib/copy/layout/navCopy";

/**
 * BrandLockup — 글로벌 셸 **밖** 단독 화면(로그인 `/login`·404)용 브랜드 로크업.
 *
 * 헤더/사이드바 brand 와 동일한 3색 맥박 배지(`BrandPulseIcon`) + 그라데이션 워드마크를 재사용하되,
 * 단독 화면의 focal 로 어울리도록 큰 배지(56px)로 키운 세로 정렬. 시각 진실(색·글리프)은
 * `lib/brand-mark.tsx` 단일 소스가 그대로 공유 — 본 컴포넌트는 배치·크기만 담당(hex/px 직타 0건).
 *
 * - `gradientId` 는 셸 아이콘(headerPulse/sidebarPulse)과 겹치지 않는 고정값 → in-shell 404
 *   (Header/Sidebar 동시 마운트)에서도 SVG defs 충돌 없음.
 * - 순수 표현(서버 호환 — `"use client"` 없음). 로그인 폼(client)·not-found(server) 양쪽에서 사용.
 *
 * @param showWordmark 워드마크(FinSight) 노출 여부. `false` = 배지 글리프만(404 브랜드 큐).
 * @param wordmarkAs   워드마크 태그 — 로그인은 페이지 제목이라 `h1`, 그 외 장식은 `span`(기본).
 * @param wordmarkId   `aria-labelledby` 참조용 id(로그인 폼 접근성 이름 연결).
 */
export function BrandLockup({
  className,
  showWordmark = true,
  wordmarkAs: WordmarkTag = "span",
  wordmarkId,
}: {
  className?: string;
  showWordmark?: boolean;
  wordmarkAs?: "span" | "h1";
  wordmarkId?: string;
}) {
  return (
    <div className={cn("inline-flex flex-col items-center gap-md", className)}>
      <span
        className="inline-flex h-14 w-14 items-center justify-center rounded-pill border border-border-line bg-surface shadow-card"
        aria-hidden="true"
      >
        <BrandPulseIcon className="h-9 w-9" gradientId="brandLockupPulse" />
      </span>
      {showWordmark ? (
        <WordmarkTag
          id={wordmarkId}
          className="bg-gradient-to-r from-text-strong to-text-muted bg-clip-text text-font-display font-font-display text-transparent"
        >
          {NAV_BRAND_LABEL}
        </WordmarkTag>
      ) : null}
    </div>
  );
}
