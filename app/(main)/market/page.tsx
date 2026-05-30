/**
 * `/market` → `/` 영구 redirect.
 *
 * home-market-redesign PR2 — 시장 동향 페이지를 홈(/) 으로 흡수.
 * 구 /market URL 진입 시 자동으로 홈으로 이동.
 */

import { redirect } from "next/navigation";

export default function MarketRoutePage() {
  redirect("/");
}
