import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      // Figma Make export (PRD finsight-redesign §9 q8 RESOLVED 옵션 B): 시리즈 머지 후 별도 cleanup PR 로 제거.
      "Stock and Coin Analysis App/**",
    ],
  },
];

export default eslintConfig;
