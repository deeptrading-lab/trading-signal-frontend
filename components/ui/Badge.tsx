/**
 * Badge — 합성 클래스(`.badge-*`)를 래핑하는 도메인 무관 원자.
 *
 * design-elevation-foundation 파운데이션 원자 레이어(서버 호환, `"use client"` 없음).
 * `warningSeverity` 등 도메인 뷰모델은 상위에서 `variant` 로 매핑해 넘긴다.
 */
import { cn } from "@/lib/utils/cn";

export type BadgeVariant =
  | "accent"
  | "warn"
  | "info"
  | "critical"
  | "signal-up"
  | "signal-down"
  | "asset-stock"
  | "asset-coin"
  | "coming-soon";

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  accent: "badge-accent",
  warn: "badge-warn",
  info: "badge-info",
  critical: "badge-critical",
  "signal-up": "badge-signal-up",
  "signal-down": "badge-signal-down",
  "asset-stock": "badge-asset-stock",
  "asset-coin": "badge-asset-coin",
  "coming-soon": "badge-coming-soon",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = "accent", className, ...rest }: BadgeProps) {
  return <span className={cn(VARIANT_CLASS[variant], className)} {...rest} />;
}
