/**
 * ConnectedExchangesCard — `/profile` 연동 거래소 / 증권사 (server component).
 *
 * PR9 (finsight-redesign) → **profile-reskin**(카드리스 플랫 섹션).
 *
 * 시안 `Profile.tsx` L29~L56 정합 — 3건 리스트 (키움증권 / 업비트 / 토스증권).
 * 각 row: 좌측 brand 닷(첫 글자) + 거래소명 + 동기화 시점 / 우측 상태 텍스트.
 *
 * profile-reskin — 카드 셸(`card`)·per-row 아웃라인 박스(`border rounded-md`) 폐기 →
 *   `Section`(플랫 제목) + `ListRow`(헤어라인 하단 구분선). 홈 랭킹/관심종목 표 톤 정합.
 *   - brand 닷 = `rankLogoDot`(soft bg + strong text) 결정론 색 — `bg-accent-vivid × text-surface`
 *     직대비 제거로 라이트/다크 AA 확보(홈 로고닷 공용).
 *   - 거래소명 = `text-body-sm-strong text-text-strong`. 동기화 = `text-caption text-text-muted`.
 *   - 상태 = 연동됨 `text-text-muted`, 연결 필요 `text-accent-vivid`.
 */

import { cn } from "@/lib/utils/cn";
import { Section } from "@/components/ui/Section";
import { ListRow } from "@/components/ui/ListRow";
import { rankLogoDotClass, rankLogoInitial } from "@/lib/utils/rankLogoDot";
import type {
  ConnectedExchange,
  SyncedAtKey,
} from "@/lib/types/profile/exchanges";
import {
  CONNECTED_SECTION_TITLE,
  EXCHANGE_STATUS_CONNECTED,
  EXCHANGE_STATUS_DISCONNECTED,
  SYNC_REALTIME,
  SYNC_1H_AGO,
  SYNC_NONE,
} from "@/lib/copy/profile/labels";

export interface ConnectedExchangesCardProps {
  exchanges: ConnectedExchange[];
}

const SYNCED_AT_LABEL: Record<SyncedAtKey, string> = {
  SYNC_REALTIME,
  SYNC_1H_AGO,
  SYNC_NONE,
};

export function ConnectedExchangesCard({
  exchanges,
}: ConnectedExchangesCardProps) {
  return (
    <Section title={CONNECTED_SECTION_TITLE}>
      <div role="list">
        {exchanges.map((exchange) => (
          <ExchangeRow key={exchange.brandKey} exchange={exchange} />
        ))}
      </div>
    </Section>
  );
}

function ExchangeRow({ exchange }: { exchange: ConnectedExchange }) {
  const isConnected = exchange.status === "CONNECTED";
  const statusLabel = isConnected
    ? EXCHANGE_STATUS_CONNECTED
    : EXCHANGE_STATUS_DISCONNECTED;
  const statusClass = isConnected ? "text-text-muted" : "text-accent-vivid";
  return (
    <ListRow role="listitem" className="justify-between">
      <div className="flex min-w-0 items-center gap-sm">
        <span
          className={cn(
            "inline-grid h-8 w-8 shrink-0 place-items-center rounded-sm text-body-sm-strong",
            rankLogoDotClass(exchange.brandKey),
          )}
          aria-hidden="true"
        >
          {rankLogoInitial(exchange.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-body-sm-strong text-text-strong">
            {exchange.name}
          </p>
          <p className="text-caption text-text-muted">
            {SYNCED_AT_LABEL[exchange.syncedAtKey]}
          </p>
        </div>
      </div>
      <span className={cn("shrink-0 text-body-sm-strong", statusClass)}>
        {statusLabel}
      </span>
    </ListRow>
  );
}
