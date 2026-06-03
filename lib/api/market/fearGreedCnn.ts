/**
 * CNN Fear & Greed Index(미국 시장) 조회 — **서버 측 only**.
 *
 * PRD `fear-greed-overhaul` — 미국 시장 심리(7지표 종합)의 실값. 엔드포인트:
 *   `https://production.dataviz.cnn.io/index/fearandgreed/graphdata`
 *   - 응답 `fear_and_greed.score`(0~100 float) + `rating`("greed" 등).
 *   - ⚠️ 봇 차단(418)이 걸려 **완전한 브라우저 헤더 세트**(UA+Accept+Referer+Origin+sec-ch-ua)가 필요.
 *
 * 안정성 의무:
 *   - 비공식 + 데이터센터 IP 차단 가능성(Vercel iad1) → 실패 시 null(throw 금지, 라우트가 mock degrade).
 *   - 자체 AbortSignal 타임아웃 + 라우트 withTimeout 이중. 브라우저 직접 import 금지(BFF 경유).
 */

import { toFearGreedLabel } from "@/lib/utils/fearGreed";
import type { FearGreed } from "@/lib/types/dashboard/fearGreed";

const CNN_URL =
  "https://production.dataviz.cnn.io/index/fearandgreed/graphdata";
const TIMEOUT_MS = 3_000;

/** CNN 봇 차단(418) 회피용 브라우저 헤더 세트 — 로컬 PoC 로 200 확인(2026-06-03). */
const CNN_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://edition.cnn.com/markets/fear-and-greed",
  Origin: "https://edition.cnn.com",
  "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
};

type CnnGraphData = {
  fear_and_greed?: { score?: number; rating?: string };
};

/** CNN 미국 F&G 현재값. 실패/차단/파싱 불가 시 null(throw 안 함). */
export async function fetchCnnFearGreed(): Promise<FearGreed | null> {
  let json: CnnGraphData;
  try {
    const res = await fetch(CNN_URL, {
      headers: CNN_HEADERS,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return null;
    json = (await res.json()) as CnnGraphData;
  } catch {
    return null;
  }
  const score = json.fear_and_greed?.score;
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  const value = Math.round(score);
  return { value, label: toFearGreedLabel(value) };
}
