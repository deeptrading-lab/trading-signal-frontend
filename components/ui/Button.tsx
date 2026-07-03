/**
 * Button — 합성 클래스(`.button-*`)를 래핑하는 도메인 무관 원자.
 *
 * design-elevation-foundation 파운데이션 원자 레이어. 시각 진실은 `app/components.css` 의
 * `@apply` 합성 클래스에 그대로 두고(토큰·다크 정합 보존), 여기선 `variant` → 클래스 매핑 + `cn` 병합만 한다.
 * **`"use client"` 를 붙이지 않는다** — 순수 표현 컴포넌트라 서버/클라 양쪽에서 쓰이며 호출부에
 * 클라이언트 경계를 강제하지 않는다(onClick 등을 쓰는 호출부가 스스로 클라 컴포넌트).
 */
import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "icon";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "button-primary",
  secondary: "button-secondary",
  icon: "button-icon",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(VARIANT_CLASS[variant], className)}
      {...rest}
    />
  );
});
