/**
 * ListRow — 플랫 리스트 행 원자(T2 탈-카드).
 *
 * 랭킹·수급·공시 등 목록을 카드 박스 없이 헤어라인 하단 구분선 + 여백으로 표현한다.
 * 컬럼 레이아웃(grid 등)은 호출부가 `className` 으로 지정(도메인마다 다르므로).
 * 순수 토큰만 사용, 서버 호환.
 */
import { cn } from "@/lib/utils/cn";

export interface ListRowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 하단 헤어라인 구분선. 마지막 행은 `last:border-b-0` 로 자동 제거. */
  divided?: boolean;
}

export function ListRow({
  divided = true,
  className,
  ...rest
}: ListRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-md py-md",
        divided && "border-b border-border-line last:border-b-0",
        className,
      )}
      {...rest}
    />
  );
}
