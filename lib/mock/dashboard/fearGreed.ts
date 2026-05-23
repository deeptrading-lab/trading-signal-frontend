/**
 * `/dashboard` Fear & Greed Index mock 데이터.
 *
 * 시안 `Dashboard.tsx` 의 `72 (Greed)` 정합. 라벨 한글 매핑은
 * `lib/copy/dashboard/labels.ts` 의 `FEAR_GREED_*`.
 */

import type { FearGreed } from "@/lib/types/dashboard/fearGreed";

export const FEAR_GREED_MOCK: FearGreed = {
  value: 72,
  label: "GREED",
};
