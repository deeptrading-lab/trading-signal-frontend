/**
 * className 합성 헬퍼.
 *
 * clsx 로 조건부·배열·객체를 평탄화하고 tailwind-merge 로 충돌하는 Tailwind 유틸리티를
 * 후자 우선으로 정리한다.
 *
 * 사용 기준 (`docs/rules/frontend.md` cn 헬퍼 절):
 *   - 조건부 className, variant 분기, 외부 className prop 합성에 의무 적용.
 *   - 정적 단일 className 에는 강제하지 않는다 (예: `<div className="text-sm" />`).
 *
 * tailwind-merge 의 기본 설정으로 시작한다. 본 저장소 커스텀 토큰
 * (`card`, `badge-warn`, `rounded-card` 등) 과 충돌이 관찰되면
 * `extendTailwindMerge` 어댑터를 이 파일 안에 추가한다.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
