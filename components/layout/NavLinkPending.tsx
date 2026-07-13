"use client";

/**
 * NavLinkPending — `next/link` 의 `useLinkStatus()` 로 **이동 중(pending)** 시각 피드백.
 *
 * nav-loading-ux: async 서버 라우트는 탭을 눌러도 RSC 응답까지 아무 반응이 없어 모바일에서
 * "안 눌린 줄 알고 또 누르는" 체감 지연을 만들었다. Link **내부** 자식에서 pending 을 읽어
 * (`useLinkStatus` 는 Link 하위에서만 동작) 눌린 항목에 즉시 액센트 틴트 + 펄스를 켠다.
 * 실제 대기 화면은 각 라우트 loading.tsx 스켈레톤이 담당 — 이 컴포넌트는 "눌림 인지"만.
 *
 * - 스타일은 `.nav-link-pending`(components.css) 조건부 리터럴 클래스 —
 *   ⚠️ `@layer` 안 속성 선택자(`[data-*]` + `@apply`)는 Turbopack 미방출 함정(#234)이라 금지.
 * - 펄스 애니는 150ms 지연 시작 — 즉시 완료되는 내비(정적 셸·캐시 히트)에선 플래시가 안 보인다
 *   (Next `useLinkStatus` 공식 권장 패턴). 액센트 틴트는 지연 없이 즉시(탭 반응성).
 * - `className` 은 부모 Link 의 내부 레이아웃(flex 방향·gap)을 그대로 넘겨받아 시각 무변경.
 */

import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

export function NavLinkPending({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { pending } = useLinkStatus();
  return (
    <span className={cn(className, pending && "nav-link-pending")}>
      {children}
    </span>
  );
}
