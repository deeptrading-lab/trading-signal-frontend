/**
 * `/dashboard` — `/profile` 로 영구 리다이렉트 (home-market-redesign PR1).
 *
 * PRD §3.3 / §9 q4=b — 계좌 위젯이 마이페이지("내 자산" 섹션)로 이전되면서 `/dashboard` 라우트는
 * 정리한다. 기존 북마크/링크가 깨지지 않도록 Next.js `redirect` 로 `/profile` 로 보낸다(AC-4).
 *
 * nav 의 "대시보드" 메뉴 자체 제거는 PR2(홈·nav 재편) 영역 — 본 PR1 은 라우트 리다이렉트만.
 * 클릭 시 깨지지 않도록 동선을 보존한다.
 */

import { redirect } from "next/navigation";

export default function DashboardRoutePage() {
  redirect("/profile");
}
