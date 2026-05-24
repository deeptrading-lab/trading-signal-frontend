/**
 * ConnectedExchangesCard — `/profile` 연동 거래소 / 증권사 카드 (server component).
 *
 * PR9 (finsight-redesign) 신규.
 *
 * 시안 `Profile.tsx` L29~L56 정합 — Link2 아이콘 + 헤더 + 3건 리스트 (키움증권 / 업비트 / 토스증권).
 * 각 row: 좌측 brand 박스 (첫 글자) + 거래소명 + 동기화 시점 / 우측 상태 텍스트.
 *
 * v8 토큰:
 *   - 카드 셸 = `card` 합성 토큰 (rounded.lg + border + card padding).
 *   - 헤더 = Link2 아이콘 (`text-accent-vivid`) + 타이틀 (`text-h2 text-text-strong`).
 *   - row 컨테이너 = `border border-border-line rounded-md p-md`.
 *   - brand 박스 = `bg-accent-vivid text-surface rounded-sm` 32×32 (시안의 demo 단색 cascade —
 *     pink/blue 직타 회피, v8 토큰 단일 색 cascade. 데모 단계 식별만).
 *   - 거래소명 = `text-body-strong text-text-strong`. 동기화 = `text-caption text-text-muted`.
 *   - 상태 텍스트 = 연동됨 `text-text-muted`, 연결 필요 `text-accent-vivid` (v8 cascade).
 */

import { Link2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
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
    <section className="card" aria-label={CONNECTED_SECTION_TITLE}>
      <header className="mb-lg flex items-center gap-sm">
        <Link2 className="h-xl w-xl text-accent-vivid" aria-hidden="true" />
        <h2 className="text-h2 text-text-strong">{CONNECTED_SECTION_TITLE}</h2>
      </header>
      <ul className="flex flex-col gap-md">
        {exchanges.map((exchange) => (
          <ExchangeRow key={exchange.brandKey} exchange={exchange} />
        ))}
      </ul>
    </section>
  );
}

function ExchangeRow({ exchange }: { exchange: ConnectedExchange }) {
  const isConnected = exchange.status === "CONNECTED";
  const statusLabel = isConnected
    ? EXCHANGE_STATUS_CONNECTED
    : EXCHANGE_STATUS_DISCONNECTED;
  const statusClass = isConnected ? "text-text-muted" : "text-accent-vivid";
  return (
    <li className="flex items-center justify-between p-md border border-border-line rounded-md">
      <div className="flex items-center gap-sm">
        <span
          className="inline-flex items-center justify-center h-2xl w-2xl rounded-sm bg-accent-vivid text-surface text-body-sm-strong"
          aria-hidden="true"
        >
          {exchange.name.charAt(0)}
        </span>
        <div>
          <p className="text-body-strong text-text-strong">{exchange.name}</p>
          <p className="text-caption text-text-muted">
            {SYNCED_AT_LABEL[exchange.syncedAtKey]}
          </p>
        </div>
      </div>
      <span className={cn("text-body-sm-strong", statusClass)}>
        {statusLabel}
      </span>
    </li>
  );
}
