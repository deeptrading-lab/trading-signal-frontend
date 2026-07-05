/**
 * MaintenanceNotice — 라이브 섹션이 데이터를 못 받을 때(점검/일시 장애) 리스트 영역을 대체하는
 * **공용 중립 안내**.
 *
 * PRD `market-status-aware-home` §3-3 / DESIGN R1·R2·R3·R4. 실시간 순위(전탭 unavailable)·순매수
 * 당일(unavailable)이 재사용한다. 초판 `MarketClosedNotice`(시각 게이팅 폐기로 소비처 소멸)를 대체.
 *
 * - 중립(muted) 톤: `surface-muted` 배경 + 정적 회색 점(`text-muted`) + `primary` 제목 + `text-muted`
 *   보조. **빨강·경고색·`critical` 금지**(점검은 에러가 아니라 대기). **다음 개장 시각 표기 없음**
 *   (마감이 아니라 점검 — ②의 "장 마감/다음 개장" 언어와 구분).
 * - `isAdmin` 이 true 일 때만 "다시 시도"(전 프로브 refetch) 노출 — 일반 사용자는 버튼 슬롯 자체를
 *   비운다(빈 placeholder 없음). 재시도는 공개 랭킹 refetch(특권 아님)라 위조돼도 실질 위험 0.
 * - `nudge` 슬롯: 순매수 당일만 넘긴다("7일 누적 보기" 유도). 실시간 순위는 미전달.
 * - 색·간격은 토큰만(hex/px 직타 0), 색맹 접근성 위해 점만 남기지 않고 제목 라벨 동반(이중 인코딩).
 * - 콘텐츠 영역 최소 높이(≈`table-row-h`×3)로 상태 전환 시 레이아웃 시프트 억제(DESIGN R12).
 */

"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import {
  MAINTENANCE_ARIA,
  MAINTENANCE_RETRY,
  MAINTENANCE_SUPPLEMENT,
  MAINTENANCE_TITLE,
} from "@/lib/copy/market/maintenance";

export interface MaintenanceNoticeProps {
  /** true 일 때만 "다시 시도" 노출(관리자 전용). 일반 사용자는 버튼 슬롯 비움. */
  isAdmin: boolean;
  /** "다시 시도" 클릭 → 전 프로브 refetch. */
  onRetry: () => void;
  /** 순매수 당일 전용 넛지 슬롯("7일 누적 보기"). 실시간 순위는 미전달. */
  nudge?: ReactNode;
  className?: string;
}

export function MaintenanceNotice({
  isAdmin,
  onRetry,
  nudge,
  className,
}: MaintenanceNoticeProps) {
  return (
    <div
      role="status"
      aria-label={MAINTENANCE_ARIA}
      className={cn(
        "flex min-h-[calc(theme(spacing.table-row-h)*3)] flex-col items-center justify-center gap-sm rounded-lg bg-surface-muted px-xl py-xl text-center",
        className,
      )}
    >
      {/* 정적 회색 점 + 제목(가로 인라인) — 색+텍스트 이중 인코딩. */}
      <div className="flex items-center gap-xs">
        <span
          className="h-sm w-sm rounded-pill bg-text-muted"
          aria-hidden="true"
        />
        <span className="text-body-strong text-primary">{MAINTENANCE_TITLE}</span>
      </div>

      {/* 보조 — 다음 개장 시각 없이 "기다리면 복구". */}
      <span className="text-caption text-text-muted">
        {MAINTENANCE_SUPPLEMENT}
      </span>

      {/* 관리자 전용 재시도 — 일반 사용자는 렌더하지 않음(슬롯 자체 비움). */}
      {isAdmin && (
        <button
          type="button"
          className="button-secondary mt-md"
          onClick={onRetry}
        >
          {MAINTENANCE_RETRY}
        </button>
      )}

      {/* 순매수 당일 넛지 슬롯("7일 누적 보기"). */}
      {nudge && <div className="mt-md">{nudge}</div>}
    </div>
  );
}
