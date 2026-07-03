/**
 * Section — 플랫 섹션 컨테이너(T2 탈-카드의 핵심).
 *
 * 제목 + 선택적 우측 액션(필터/더보기 등) 헤더 + 본문. **카드 박스를 두르지 않는다** —
 * 흰 바탕 위에 제목·여백·헤어라인으로만 구분(토스 톤). 카드가 필요한 모듈만 `Card` 사용.
 * 순수 토큰(spacing·typography·color)만 쓰고 hex/px 직타 없음. 서버 호환.
 */
import { cn } from "@/lib/utils/cn";

export interface SectionProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title?: React.ReactNode;
  /** 제목 우측 정렬 액션(카운트·필터·더보기). */
  action?: React.ReactNode;
}

export function Section({
  title,
  action,
  className,
  children,
  ...rest
}: SectionProps) {
  return (
    <section className={cn("flex flex-col gap-md", className)} {...rest}>
      {(title || action) && (
        <div className="flex items-center gap-sm">
          {title && <h2 className="text-h2 text-text-strong">{title}</h2>}
          {action && (
            <div className="ml-auto flex items-center gap-sm">{action}</div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
