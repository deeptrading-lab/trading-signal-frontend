/**
 * CNN(미국) 공포·탐욕 지수 mock.
 *
 * PRD `fear-greed-overhaul` — CNN 차단/실패/비설정 시 BFF(`/api/market/fear-greed`)가 반환.
 * 레이아웃·게이지 검증용. 사용자 노출 한글 카피 0건.
 */

import { toFearGreedLabel } from "@/lib/utils/fearGreed";
import type { FearGreed } from "@/lib/types/dashboard/fearGreed";

export function getMockCnnFearGreed(): FearGreed {
  const value = 57;
  return { value, label: toFearGreedLabel(value) };
}
