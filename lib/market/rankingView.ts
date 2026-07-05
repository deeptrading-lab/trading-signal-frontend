/**
 * 실시간 순위 섹션의 가용성 기반 뷰 파생 — 순수 함수(컴포넌트에서 분리해 단위 테스트).
 *
 * PRD `market-status-aware-home` §3-1 / DESIGN R5·R6·R7. 탭별 가용성(`Availability`) 맵과 현재 활성
 * 탭으로부터 (a) 노출할 available 탭 목록, (b) 활성 탭 소실 시 자동 이동 대상(effectiveTab),
 * (c) 콘텐츠 뷰 상태(loading/list/maintenance)를 계산한다.
 *
 * 규칙:
 *   - available 탭만 노출(unavailable 은 목록에서 제외 — 컴포넌트가 DOM 제거).
 *   - 활성 탭이 available 목록에 없으면 첫 available 로 이동(effectiveTab). 그 외엔 활성 탭 유지.
 *   - 아무 탭도 settled 전 → loading(점검 오판 방지).
 *   - 전탭 settled + available 0 → maintenance. 일부 아직 로딩이면 loading 유지.
 *   - available ≥ 1 → list.
 */

import type { Availability } from "@/lib/market/availability";

export type RankingViewState = "loading" | "list" | "maintenance";

export type RankingView<T extends string> = {
  /** 노출할 available 탭(입력 순서 보존, 좌측 정렬용). */
  availableTabs: T[];
  /** 활성 탭(available 이면 그대로, 아니면 첫 available). 전탭 unavailable 이면 undefined. */
  effectiveTab: T | undefined;
  /** settled(로딩 아님) 탭 수. */
  settledCount: number;
  /** 전 탭 settled 여부. */
  allSettled: boolean;
  /** 콘텐츠 영역 렌더 상태. */
  view: RankingViewState;
};

export function deriveRankingView<T extends string>(
  order: readonly T[],
  availabilityByTab: Record<T, Availability>,
  activeTab: T,
): RankingView<T> {
  const availableTabs = order.filter((t) => availabilityByTab[t] === "available");
  const settledCount = order.filter(
    (t) => availabilityByTab[t] !== "loading",
  ).length;
  const allSettled = settledCount === order.length;

  const effectiveTab: T | undefined = availableTabs.includes(activeTab)
    ? activeTab
    : availableTabs[0];

  let view: RankingViewState;
  if (settledCount === 0) {
    view = "loading";
  } else if (availableTabs.length === 0) {
    view = allSettled ? "maintenance" : "loading";
  } else {
    view = "list";
  }

  return { availableTabs, effectiveTab, settledCount, allSettled, view };
}
