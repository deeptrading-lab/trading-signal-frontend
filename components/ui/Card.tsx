/**
 * Card — 합성 클래스(`.card`, `.card-*`)를 래핑하는 도메인 무관 원자.
 *
 * design-elevation-foundation 파운데이션 원자 레이어(서버 호환, `"use client"` 없음).
 * ★ 탈-카드(T2) 원칙상 "선별 사용" — 모든 것을 카드로 박스치지 않는다. 플랫 섹션은 `Section` 사용.
 * 기존 `className="card"` 사이트(58파일)를 일괄 이관하지 않는다(합성 클래스와 픽셀 동일 공존).
 */
import { cn } from "@/lib/utils/cn";

export type CardVariant =
  | "default"
  | "elevated"
  | "hero"
  | "ai"
  | "warn"
  | "critical"
  | "info";

const VARIANT_CLASS: Record<CardVariant, string> = {
  default: "card",
  elevated: "card-elevated",
  hero: "card-hero",
  ai: "card-ai",
  warn: "card-warn",
  critical: "card-critical",
  info: "card-info",
};

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  variant?: CardVariant;
  /** 시맨틱 태그 — 기본 `section`. 목록 아이템 등은 `div`/`article`. */
  as?: "section" | "div" | "article";
}

export function Card({
  variant = "default",
  as: Tag = "section",
  className,
  ...rest
}: CardProps) {
  return <Tag className={cn(VARIANT_CLASS[variant], className)} {...rest} />;
}
