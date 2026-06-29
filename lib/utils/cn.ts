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
 * ⚠️ 커스텀 fontSize 토큰을 font-size 그룹으로 등록한다.
 *   tailwind-merge 기본 설정은 `text-button`·`text-body-sm-strong` 같은 **커스텀 폰트크기**를
 *   "text-{color}" 로 오인해, 같은 cn() 안의 `text-surface`(색)와 충돌시켜 **색을 떨어뜨렸다**
 *   (예: `cn("bg-accent-vivid text-surface text-button")` → `text-surface` 증발 → 글자색 상속(대비 깨짐)).
 *   theme 의 fontSize 키를 font-size 그룹에 명시해, 폰트크기와 색이 서로 다른 그룹으로 공존하게 한다.
 *   새 fontSize 토큰을 DESIGN.md 에 추가하면 이 목록에도 함께 추가한다(`tailwind.theme.json` fontSize 키와 일치).
 */

import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/** `tailwind.theme.json` 의 fontSize 키 — `text-{key}` 가 색이 아니라 폰트크기로 인식되도록 등록. */
const FONT_SIZE_TOKENS = [
  "display",
  "font-display",
  "h1",
  "h2",
  "body-md",
  "body-sm",
  "body-sm-strong",
  "body-strong",
  "caption",
  "button",
  "button-sm",
  "badge",
  "mono-numeric",
  "nav-brand",
  "sidebar-section",
  "label-sm",
  "input-suffix",
  "gauge-score",
  "table-cell-numeric",
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: FONT_SIZE_TOKENS }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
