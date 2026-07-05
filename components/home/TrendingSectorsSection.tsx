/**
 * TrendingSectorsSection — 홈 "지금 뜨는 산업"(업종 등락 랭킹) 섹션, **가용성 기반** 렌더.
 *
 * PRD `trending-sectors` §3-7 / DESIGN. 실시간 순위·순매수와 형제로 렌더되는 자족 리스트 —
 * 각 행이 "순번 · 업종명 · 등락률 · N개 중 M개 상승" 으로 한 산업의 상태를 다 말한다(모달 없이도 완결).
 *
 * **가용성 판정(`resolveAvailability`)**:
 *   - available   = `isError=false` AND `dataSource ∈ {kis, mock}`(dev mock 정상 표시)
 *   - unavailable = `isError=true` OR `dataSource ∈ {mock-timeout, mock-empty, mock-error}` → `MaintenanceNotice`
 *   - loading     = 첫 프로브 진행 중 → 스켈레톤
 *
 * 등락 부호색(상승=빨강/하락=파랑)은 `signal-up-text`/`signal-down-text` 합성 클래스. breadth 요약은
 * `total > 0`(fan-out 성공) 일 때만 렌더(등락률은 항상 표시). 업종 행 클릭 → 구성종목 모달.
 *
 * 컨벤션(`docs/rules/frontend.md` §1·§2): useQuery 직접 import 금지 → 도메인 훅만 소비.
 */

"use client";

import { useState } from "react";
import { Section } from "@/components/ui/Section";
import { ListRow } from "@/components/ui/ListRow";
import { Skeleton } from "@/components/ui/Skeleton";
import { MaintenanceNotice } from "@/components/market/MaintenanceNotice";
import { SectorConstituentsModal } from "@/components/market/SectorConstituentsModal";
import { useQuerySectorRanking } from "@/hooks/market/useQuerySectorRanking";
import { useMe } from "@/hooks/auth/useMe";
import { resolveAvailability } from "@/lib/market/availability";
import { cn } from "@/lib/utils/cn";
import { formatPct } from "@/lib/utils/formatPct";
import type { SectorRankItem } from "@/lib/types/market/sectors";
import {
  SECTORS_SECTION_TITLE,
  SECTORS_SECTION_CAPTION,
  SECTORS_LOADING,
  SECTORS_EMPTY,
  sectorsBreadthSummary,
  sectorRowAria,
} from "@/lib/copy/market/sectors";

/** 등락 방향 → 등락률 색 합성 클래스(cn 사이즈 override 시에도 색 유지). */
function changeClass(direction: SectorRankItem["direction"]): string {
  if (direction === "up") return "signal-up-text";
  if (direction === "down") return "signal-down-text";
  return "text-text-muted text-mono-numeric tabular-nums";
}

export function TrendingSectorsSection() {
  const query = useQuerySectorRanking();
  const { isAdmin } = useMe();
  const [selected, setSelected] = useState<SectorRankItem | null>(null);

  const availability = resolveAvailability({
    isLoading: query.isLoading,
    isError: query.isError,
    dataSource: query.dataSource,
  });

  const sectors = query.data?.sectors ?? [];

  return (
    <Section title={SECTORS_SECTION_TITLE}>
      <p className="-mt-xs text-caption text-text-muted">
        {SECTORS_SECTION_CAPTION}
      </p>

      {availability === "loading" && <SectorSkeleton />}

      {availability === "unavailable" && (
        <MaintenanceNotice isAdmin={isAdmin} onRetry={() => query.refetch()} />
      )}

      {availability === "available" && sectors.length === 0 && (
        <p className="py-md text-body-sm text-text-muted">{SECTORS_EMPTY}</p>
      )}

      {availability === "available" && sectors.length > 0 && (
        <div role="list">
          {sectors.map((sector, i) => (
            <SectorRow
              key={sector.code}
              sector={sector}
              rank={i + 1}
              onClick={() => setSelected(sector)}
            />
          ))}
        </div>
      )}

      {selected && (
        <SectorConstituentsModal
          sector={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </Section>
  );
}

/**
 * 업종 랭킹 1행 — 실시간 순위표(`RealtimeRankingSection`)와 동일 밀도의 카드리스 플랫 행(`ListRow`
 * 헤어라인 + `py-md`). 좌: 순번+업종명, 우: 등락률+breadth 요약(세로). 클릭 → 구성종목 모달.
 *   폰트도 순위표 정합(업종명·등락률 `text-body-sm-strong`, breadth `text-caption`) — 이전엔 56px 고정
 *   높이 + `text-body-strong`/무크기 등락률로 형제 순위표보다 과하게 커 보였다(사용자 지적).
 */
function SectorRow({
  sector,
  rank,
  onClick,
}: {
  sector: SectorRankItem;
  rank: number;
  onClick: () => void;
}) {
  return (
    <ListRow
      role="listitem"
      tabIndex={0}
      aria-label={sectorRowAria(sector.name)}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "-mx-sm cursor-pointer rounded-sm px-sm transition-colors",
        "hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none",
      )}
    >
      {/* 순번 — 순위표와 동일한 plain 넘버(회색 배지 제거) */}
      <span className="w-5 shrink-0 text-center text-caption font-bold tabular-nums text-text-muted">
        {rank}
      </span>

      {/* 업종명 */}
      <span className="min-w-0 flex-1 truncate text-body-sm-strong text-text-strong">
        {sector.name}
      </span>

      {/* 등락률 + breadth(세로 우정렬) */}
      <div className="flex shrink-0 flex-col items-end">
        <span
          className={cn("text-body-sm-strong", changeClass(sector.direction))}
        >
          {formatPct(sector.changePct, { sign: true })}
        </span>
        {sector.total > 0 && (
          <span className="text-caption text-text-muted">
            {sectorsBreadthSummary(sector.up, sector.total)}
          </span>
        )}
      </div>
    </ListRow>
  );
}

/** 로딩 — 순위표 정합 플랫 스켈레톤 행(헤어라인). */
function SectorSkeleton() {
  return (
    <div aria-busy="true" aria-label={SECTORS_LOADING}>
      <span className="sr-only">{SECTORS_LOADING}</span>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-md border-b border-border-line py-md last:border-b-0"
        >
          <Skeleton variant="line" className="mb-0 h-4 w-5" />
          <Skeleton variant="line" className="mb-0 h-4 w-1/3" />
          <Skeleton variant="line" className="mb-0 ml-auto h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
