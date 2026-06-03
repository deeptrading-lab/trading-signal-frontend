/**
 * `/api/market/fear-greed` BFF route — CNN(미국) 공포·탐욕 지수 프록시.
 *
 * PRD `fear-greed-overhaul`. (국내 지수는 홈이 이미 받는 코스피 지수로 클라이언트가 합성 →
 * 본 라우트는 미국 CNN 실값만 담당.)
 *
 * - GET → `FearGreed`(value 0~100 + label).
 * - 비핵심 보조 정보 + 비공식 출처(CNN) → 실패/차단/타임아웃 시 **mock degrade**(200).
 * - 3s 타임아웃(외부 AbortSignal + withTimeout 이중).
 */

import { fetchCnnFearGreed } from "@/lib/api/market/fearGreedCnn";
import { getMockCnnFearGreed } from "@/lib/mock/dashboard/fearGreedCnn";
import { withTimeout, jsonWithDataSource } from "@/lib/server/bffUtils";

const TIMEOUT_MS = 3_000;

export async function GET() {
  try {
    const data = await withTimeout(fetchCnnFearGreed(), TIMEOUT_MS);
    if (data) {
      return jsonWithDataSource(data, "cnn");
    }
  } catch {
    // 타임아웃/네트워크 → mock.
  }
  return jsonWithDataSource(getMockCnnFearGreed(), "mock");
}
