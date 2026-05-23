import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      // Figma Make export (PRD finsight-redesign §9 q8 RESOLVED 옵션 B): 시리즈 머지 후 별도 cleanup PR 로 제거.
      "Stock and Coin Analysis App/**",
    ],
  },
  {
    // eslint-plugin-react-hooks 7 (Next 16 동반) 신규 규칙 비활성화.
    // 본 chore 는 의존성 메이저 업그레이드 한정 — 소스 코드 변경 0 라인 정책 (PRD §4).
    // 해당 패턴 (SSR hydration swap, focusIndex clamp) 의 별도 리팩터링은 후속 chore PR 로 분리.
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
