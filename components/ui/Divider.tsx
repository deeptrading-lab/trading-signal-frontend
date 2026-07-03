/**
 * Divider — 헤어라인 구분선 원자(T2 탈-카드의 기본 도구).
 *
 * 카드 박스 대신 얇은 선 + 여백으로 섹션/행을 구분한다. `border-line` 토큰 사용.
 */
import { cn } from "@/lib/utils/cn";

export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: "horizontal" | "vertical";
}

export function Divider({
  orientation = "horizontal",
  className,
  ...rest
}: DividerProps) {
  return (
    <hr
      aria-orientation={orientation}
      className={cn(
        "border-0 bg-border-line",
        orientation === "vertical" ? "h-full w-px" : "h-px w-full",
        className,
      )}
      {...rest}
    />
  );
}
