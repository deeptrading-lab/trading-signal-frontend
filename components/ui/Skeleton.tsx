/**
 * Skeleton — 합성 클래스(`.skeleton`, `.skeleton-line*`)를 래핑하는 로딩 플레이스홀더 원자.
 *
 * design-elevation-foundation 파운데이션 원자 레이어(서버 호환).
 */
import { cn } from "@/lib/utils/cn";

export type SkeletonVariant = "block" | "line" | "line-narrow" | "line-medium";

const VARIANT_CLASS: Record<SkeletonVariant, string> = {
  block: "skeleton",
  line: "skeleton-line",
  "line-narrow": "skeleton-line-narrow",
  "line-medium": "skeleton-line-medium",
};

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
}

export function Skeleton({
  variant = "block",
  className,
  ...rest
}: SkeletonProps) {
  return (
    <div
      className={cn(VARIANT_CLASS[variant], className)}
      aria-hidden="true"
      {...rest}
    />
  );
}
